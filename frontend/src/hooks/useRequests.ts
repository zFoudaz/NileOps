import { useState, useCallback } from 'react';
import api from '@/lib/api';
import type {
  AccountType,
  BankRequest,
  Document,
  DocumentType,
  ExtractedDataResponse,
  ProcessResponse,
  RequestType,
} from '@/types';

export function useRequests() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createRequest = useCallback(
    async (
      subTypeOrType: RequestType | AccountType | string,
      maybeSubType?: AccountType | string
    ): Promise<BankRequest> => {
      setIsLoading(true);
      setError(null);
      try {
        let requestType: RequestType = 'account_opening';
        let subType: AccountType = 'individual';

        if (maybeSubType) {
          requestType = (subTypeOrType as RequestType) || 'account_opening';
          subType = maybeSubType as AccountType;
        } else {
          subType = subTypeOrType as AccountType;
        }

        const response = await api.post<BankRequest>('/requests', {
          request_type: requestType,
          sub_type: subType,
        });
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في إنشاء الطلب';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getMyRequests = useCallback(async (): Promise<BankRequest[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<BankRequest[]>('/requests');
      return response.data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'فشل في جلب قائمة الطلبات';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRequest = useCallback(async (id: string): Promise<BankRequest> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<BankRequest>(`/requests/${id}`);
      return response.data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || 'فشل في جلب تفاصيل الطلب';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(
    async (
      requestId: string,
      documentType: DocumentType | string,
      file: File
    ): Promise<Document> => {
      setIsLoading(true);
      setError(null);
      try {
        const formData = new FormData();
        formData.append('document_type', documentType);
        formData.append('file', file);

        const response = await api.post<Document>(
          `/requests/${requestId}/documents`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في رفع المستند';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const processDocuments = useCallback(
    async (requestId: string): Promise<ProcessResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post<ProcessResponse>(
          `/requests/${requestId}/process`
        );
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في بدء معالجة المستندات';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getExtractedData = useCallback(
    async (requestId: string): Promise<ExtractedDataResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<ExtractedDataResponse>(
          `/requests/${requestId}/extracted-data`
        );
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في جلب البيانات المستخرجة';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitCorrection = useCallback(
    async (
      requestId: string,
      documentId: string,
      correctedFields: Record<string, unknown>
    ): Promise<Document> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.patch<Document>(
          `/requests/${requestId}/corrections`,
          {
            document_id: documentId,
            corrected_fields: correctedFields,
          }
        );
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في حفظ التعديلات';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const submitForReview = useCallback(
    async (requestId: string): Promise<BankRequest> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post<BankRequest>(
          `/requests/${requestId}/submit`
        );
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في إرسال الطلب للمراجعة';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getEmployeeRequests = useCallback(
    async (params?: {
      status?: string;
      sub_type?: string;
      start_date?: string;
      end_date?: string;
      page?: number;
      limit?: number;
    }): Promise<BankRequest[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<BankRequest[]>('/employee/requests', {
          params,
        });
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في جلب طلبات المراجعة';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getEmployeeRequestDetail = useCallback(
    async (id: string): Promise<BankRequest> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<BankRequest>(`/employee/requests/${id}`);
        return response.data;
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail || 'فشل في جلب تفاصيل الطلب';
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyRequest = useCallback(
    async (
      id: string,
      payload: { decision: 'approved' | 'rejected'; reason?: string; notes?: string }
    ): Promise<BankRequest> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.post<BankRequest>(
          `/employee/requests/${id}/verify`,
          payload
        );
        return response.data;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { status?: number; data?: { detail?: string } };
        };
        const message =
          axiosErr.response?.data?.detail || 'فشل في إتمام عملية التدقيق والتحقق';
        setError(message);
        const customError = new Error(message) as Error & { status?: number };
        if (axiosErr.response?.status) {
          customError.status = axiosErr.response.status;
        }
        throw customError;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    createRequest,
    getMyRequests,
    getRequest,
    uploadDocument,
    processDocuments,
    getExtractedData,
    submitCorrection,
    submitForReview,
    getEmployeeRequests,
    getEmployeeRequestDetail,
    verifyRequest,
  };
}
