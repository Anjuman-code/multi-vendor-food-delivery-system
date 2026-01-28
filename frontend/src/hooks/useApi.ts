import { useState, useEffect } from 'react';
import httpClient from '../lib/httpClient';

// Define types
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  [key: string]: any;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
}

// Custom hook for making API calls with loading and error states
const useApi = <T = any>(url: string, options: RequestOptions = {}) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response: ApiResponse<T> = await httpClient({
          url,
          ...options,
        });

        setData(response.data);
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching data');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function to prevent state updates on unmounted components
    return () => {
      // Cancel any ongoing requests if needed
    };
  }, [url]);

  return { data, loading, error };
};

// Specific hooks for common HTTP methods
const useGet = <T = any>(url: string) => {
  return useApi<T>(url, { method: 'GET' });
};

const usePost = <T = any>(url: string, body: any) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const postData = async (): Promise<ApiResponse<T>> => {
    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<T> = await httpClient.post(url, body);
      setData(response.data);

      return response;
    } catch (err: any) {
      setError(err.message || 'An error occurred while posting data');
      console.error('POST Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, postData };
};

const usePut = <T = any>(url: string, body: any) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const putData = async (): Promise<ApiResponse<T>> => {
    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<T> = await httpClient.put(url, body);
      setData(response.data);

      return response;
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating data');
      console.error('PUT Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, putData };
};

const useDelete = (url: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deleteData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await httpClient.delete(url);

      return response;
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting data');
      console.error('DELETE Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, deleteData };
};

export { useApi, useGet, usePost, usePut, useDelete };