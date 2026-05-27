/**
 * CSV Import/Export Type Definitions
 * Shared interfaces for CSV operations
 */

export interface CSVExportRequest {
  entity_type: string;
  fields: string[];
  batch_size?: number;
}

export interface CSVImportRequest {
  file: File;
  entity_type: string;
  options?: {
    skip_duplicates?: boolean;
    update_existing?: boolean;
  };
}

export interface CSVJobStatus {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled';
  progress: number;
  total_rows?: number;
  processed_rows?: number;
  total?: number;
  processed?: number;
  error_rows?: number;
  error_message?: string;
  download_url?: string;
  result?: any;
  created_at: string;
  updated_at: string;
}

export interface CSVExportResponse {
  job_id: string;
  message: string;
}

export interface CSVImportResponse {
  job_id: string;
  message: string;
}

export interface CSVProgressData extends CSVJobStatus {
  entity_type: string;
  operation: 'export' | 'import';
}
