import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase';

/**
 * Get the status of a CSV processing job
 */
export async function GET(request, { params }) {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 },
      );
    }

    const supabase = createSupabaseClient();

    const { data: job, error } = await supabase
      .from('csv_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        totalRows: job.total_rows,
        processedRows: job.processed_rows,
        progress: job.total_rows > 0 
          ? Math.round((job.processed_rows / job.total_rows) * 100) 
          : 0,
        results: job.results,
        errors: job.errors,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job status' },
      { status: 500 },
    );
  }
}

