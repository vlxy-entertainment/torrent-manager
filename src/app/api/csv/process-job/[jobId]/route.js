import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/utils/supabase';

/**
 * Process a queued CSV job
 * 
 * This endpoint processes a CSV job that was queued by the /api/csv/process endpoint.
 * It can be called manually or triggered by a cron job.
 */
export async function POST(request, { params }) {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 },
      );
    }

    const supabase = createSupabaseClient();

    // Get job from database
    const { data: job, error: fetchError } = await supabase
      .from('csv_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (fetchError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 },
      );
    }

    // Check if job is already processing or completed
    if (job.status === 'processing') {
      return NextResponse.json(
        { error: 'Job is already being processed' },
        { status: 409 },
      );
    }

    if (job.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Job already completed',
        job: {
          id: job.id,
          status: job.status,
          processedRows: job.processed_rows,
          totalRows: job.total_rows,
          results: job.results,
          errors: job.errors,
        },
      });
    }

    // Update job status to processing
    await supabase
      .from('csv_processing_jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    // Parse torrents
    const torrents = JSON.parse(job.torrents_data);

    // Parse CSV
    const Papa = (await import('papaparse')).default;
    const parseResult = Papa.parse(job.csv_data, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      await supabase
        .from('csv_processing_jobs')
        .update({
          status: 'failed',
          errors: parseResult.errors,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json(
        { error: 'CSV parsing errors', errors: parseResult.errors },
        { status: 400 },
      );
    }

    const rows = parseResult.data;
    const results = [];
    const errors = [];
    let processedCount = 0;

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const {
          title,
          video_network,
          release_date,
          actresses,
          thumbnail,
          hash,
          description,
        } = row;

        // Validate required fields
        if (!title || !hash) {
          errors.push({
            row: i + 1,
            error: 'Missing required fields: title or hash',
          });
          continue;
        }

        // Find torrent by hash
        const normalizedHash = hash.toLowerCase().trim();
        const torrent = torrents.find(
          (t) => t.hash?.toLowerCase() === normalizedHash,
        );

        if (!torrent) {
          errors.push({
            row: i + 1,
            error: `Torrent not found for hash: ${hash}`,
          });
          continue;
        }

        // Get torrent_id
        const torrent_id = torrent.id || torrent.torrent_id;

        if (!torrent_id) {
          errors.push({
            row: i + 1,
            error: `No torrent_id found for hash: ${hash}`,
          });
          continue;
        }

        // Get largest file
        if (!torrent.files || torrent.files.length === 0) {
          errors.push({
            row: i + 1,
            error: `No files found in torrent for hash: ${hash}`,
          });
          continue;
        }

        const largestFile = torrent.files.reduce((prev, current) => {
          const prevSize = prev.size || 0;
          const currentSize = current.size || 0;
          return currentSize > prevSize ? current : prev;
        });

        const file_id = largestFile.id;

        // Download and upload thumbnail
        let thumbnail_url = null;
        if (thumbnail && thumbnail.trim()) {
          try {
            // Download image
            const imageResponse = await fetch(thumbnail.trim());
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to download thumbnail: ${imageResponse.statusText}`,
              );
            }

            // Get content type from response headers
            let contentType = imageResponse.headers.get('content-type');
            
            const imageBuffer = await imageResponse.arrayBuffer();
            
            // Validate and detect image type from magic bytes
            const uint8Array = new Uint8Array(imageBuffer);
            let detectedMimeType = null;
            
            // Check magic bytes to determine actual image type
            if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8 && uint8Array[2] === 0xFF) {
              // JPEG: FF D8 FF
              detectedMimeType = 'image/jpeg';
            } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
              // PNG: 89 50 4E 47
              detectedMimeType = 'image/png';
            } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x38) {
              // GIF: 47 49 46 38
              detectedMimeType = 'image/gif';
            } else if (
              uint8Array[0] === 0x52 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46 && uint8Array[3] === 0x46 &&
              uint8Array[8] === 0x57 && uint8Array[9] === 0x45 && uint8Array[10] === 0x42 && uint8Array[11] === 0x50
            ) {
              // WebP: RIFF...WEBP
              detectedMimeType = 'image/webp';
            }

            if (!detectedMimeType) {
              throw new Error(
                `Downloaded file does not have valid image file headers. Content-Type: ${contentType || 'unknown'}`,
              );
            }

            // Use detected MIME type if Content-Type header is missing or incorrect
            if (!contentType || !contentType.startsWith('image/')) {
              contentType = detectedMimeType;
            }

            const imageBlob = new Blob([imageBuffer], {
              type: contentType,
            });

            // Upload to image upload endpoint
            const uploadEndpoint = process.env.IMAGE_UPLOAD_ENDPOINT;
            if (!uploadEndpoint) {
              throw new Error('IMAGE_UPLOAD_ENDPOINT not configured');
            }

            const uploadFormData = new FormData();
            uploadFormData.append(
              'file',
              imageBlob,
              `thumbnail-${hash}-${Date.now()}.jpg`,
            );

            const uploadResponse = await fetch(
              `${uploadEndpoint}/api/upload/tiktok`,
              {
                method: 'POST',
                body: uploadFormData,
              },
            );

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json().catch(() => ({}));
              throw new Error(
                `Failed to upload thumbnail: ${uploadResponse.statusText}`,
              );
            }

            const uploadResult = await uploadResponse.json();
            if (uploadResult.success && uploadResult.url) {
              thumbnail_url = uploadResult.url;
            } else {
              throw new Error(
                `Upload failed: ${uploadResult.message || 'Unknown error'}`,
              );
            }
          } catch (error) {
            console.error(`Error processing thumbnail for row ${i + 1}:`, error);
            // Leave thumbnail_url as null if processing fails
            errors.push({
              row: i + 1,
              warning: `Thumbnail processing failed, leaving field empty: ${error.message}`,
            });
          }
        }

        // Insert into video_processing_queue
        // Process description - use it if it has a value, otherwise null
        const video_description = description?.trim() || null;

        const { data: queueItem, error: insertError } = await supabase
          .from('video_processing_queue')
          .insert({
            index: -1,
            status: 'queued',
            progress: 0,
            video_name: title.trim(),
            torrent_id: String(torrent_id),
            file_id: String(file_id),
            release_date: release_date?.trim() || null,
            actresses: actresses?.trim() || null,
            thumbnail_url: thumbnail_url?.trim() || null,
            video_network: video_network?.trim() || null,
            video_description: video_description,
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Database insert failed: ${insertError.message}`);
        }

        results.push({
          row: i + 1,
          title,
          queueItemId: queueItem.id,
        });

        processedCount++;

        // Update progress every 10 rows to avoid too many DB writes
        if (processedCount % 10 === 0) {
          await supabase
            .from('csv_processing_jobs')
            .update({
              processed_rows: processedCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jobId);
        }
      } catch (error) {
        errors.push({
          row: i + 1,
          error: error.message || 'Unknown error',
        });
      }
    }

    // Update job status to completed
    await supabase
      .from('csv_processing_jobs')
      .update({
        status: 'completed',
        processed_rows: processedCount,
        results: results,
        errors: errors.length > 0 ? errors : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    return NextResponse.json({
      success: true,
      processed: results.length,
      total: rows.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('CSV processing error:', error);
    
    // Update job status to failed
    const supabase = createSupabaseClient();
    await supabase
      .from('csv_processing_jobs')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .catch(err => console.error('Failed to update job status:', err));

    return NextResponse.json(
      { error: error.message || 'Failed to process CSV' },
      { status: 500 },
    );
  }
}

