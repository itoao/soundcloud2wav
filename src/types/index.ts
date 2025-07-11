export interface ConversionError {
  error: string;
  code?: string;
}

export interface ConversionRequest {
  url: string;
}

export interface ConversionResponse {
  success: boolean;
  message?: string;
}