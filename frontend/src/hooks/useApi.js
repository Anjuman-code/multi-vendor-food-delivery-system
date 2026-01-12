import { useState, useEffect } from 'react';
import httpClient from '../lib/httpClient';

// Custom hook for making API calls with loading and error states
const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await httpClient({
          url,
          ...options,
        });
        
        setData(response.data);
      } catch (err) {
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
const useGet = (url) => {
  return useApi(url, { method: 'GET' });
};

const usePost = (url, body) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const postData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await httpClient.post(url, body);
      setData(response.data);
      
      return response;
    } catch (err) {
      setError(err.message || 'An error occurred while posting data');
      console.error('POST Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, postData };
};

const usePut = (url, body) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const putData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await httpClient.put(url, body);
      setData(response.data);
      
      return response;
    } catch (err) {
      setError(err.message || 'An error occurred while updating data');
      console.error('PUT Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, putData };
};

const useDelete = (url) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await httpClient.delete(url);
      
      return response;
    } catch (err) {
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