import { useCallback, useState } from "react";

type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
  action?: React.ReactNode;
};

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const toast = useCallback((props: Omit<ToastProps, "id"> & { id?: string }) => {
    const id = props.id ?? Math.random().toString(36).substring(2, 9);
    const { id: _id, ...rest } = props;
    const newToast = { ...rest, id } as ToastProps;

    setToasts((prevToasts) => [...prevToasts, newToast]);

    // Auto dismiss
    if (rest.duration !== Infinity) {
      setTimeout(() => {
        setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
      }, rest.duration || 5000);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return { toast, dismiss, toasts };
}
