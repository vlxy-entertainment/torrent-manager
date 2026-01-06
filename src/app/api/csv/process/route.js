import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase';
import { randomUUID } from 'crypto';

/**
 * Queue CSV file for asynchronous processing
 * 
 * This endpoint accepts a CSV file and queues it for background processing.
 * It returns immediately with a job ID, allowing the client to check status later.
 * 
 * Expected CSV columns:
 * - title: Video title
 * - video_network: Network name
 * - release_date: Release date (YYYY-MM-DD)
 * - actresses: Comma-separated actress names
 * - magnet: Ignored
 * - thumbnail: Thumbnail URL
 * - hash: Torrent hash ID
 * - description: Video description (optional)
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const csvFile = formData.get('file');
    const torrentsJson = formData.get('torrents'); // JSON string of torrents array

    if (!csvFile) {
      return NextResponse.json(
        { error: 'No CSV file provided' },
        { status: 400 },
      );
    }

    if (!torrentsJson) {
      return NextResponse.json(
        { error: 'No torrents data provided' },
        { status: 400 },
      );
    }

    // Read CSV file
    const csvText = await csvFile.text();

    // Basic CSV validation - parse to check for errors
    const Papa = (await import('papaparse')).default;
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      preview: 1, // Only parse first row for validation
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing errors', errors: parseResult.errors },
        { status: 400 },
      );
    }

    // Count total rows (approximate)
    const fullParse = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
    });
    const totalRows = fullParse.data.length;

    // Create job in database
    const supabase = createSupabaseClient();
    const jobId = randomUUID();

    // Store job data - we'll use a JSONB column to store the CSV data and torrents
    const { data: job, error: insertError } = await supabase
      .from('csv_processing_jobs')
      .insert({
        id: jobId,
        status: 'pending',
        total_rows: totalRows,
        processed_rows: 0,
        csv_data: csvText,
        torrents_data: torrentsJson,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      // If table doesn't exist, create it inline or return helpful error
      console.error('Failed to create CSV processing job:', insertError);
      
      // Try to create the table structure (this will fail if we don't have permissions)
      // For now, return error with instructions
      return NextResponse.json(
        { 
          error: 'Failed to queue CSV processing job',
          details: insertError.message,
          hint: 'The csv_processing_jobs table may need to be created. See migration file.'
        },
        { status: 500 },
      );
    }

    // Trigger background processing (non-blocking)
    // Process the job in the background without blocking the response
    // Note: In production, you may want to use a proper job queue (e.g., Bull, BullMQ)
    // or trigger this via a cron job that polls for pending jobs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
    fetch(`${baseUrl}/api/csv/process-job/${jobId}`, {
      method: 'POST',
    }).catch(err => {
      console.error('Failed to trigger background processing:', err);
      // Don't fail the request if background trigger fails
      // The job can be processed later via manual trigger or cron job
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'queued',
      totalRows,
      message: 'CSV file queued for processing. Processing will happen in the background.',
    });
  } catch (error) {
    console.error('CSV queueing error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to queue CSV for processing' },
      { status: 500 },
    );
  }
}
