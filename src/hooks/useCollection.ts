import { useEffect, useRef, useState } from 'react';

interface UseCollectionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * โหลดคอลเลกชันข้อมูลผ่าน list() ครั้งแรก แล้วติดตามการเปลี่ยนแปลงด้วย subscribe()
 * ใช้ร่วมกันได้ทั้งโหมดทดลอง (pub/sub ในหน่วยความจำ) และโหมด Firebase (onSnapshot)
 */
export function useCollection<T>(
  list: () => Promise<T[]>,
  subscribe?: (onChange: (items: T[]) => void) => () => void,
  deps: unknown[] = [],
): UseCollectionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;

    list()
      .then((items) => {
        if (!mounted.current) return;
        setData(items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
        setLoading(false);
      });

    if (subscribe) {
      unsubscribe = subscribe((items) => {
        if (mounted.current) setData(items);
      });
    }

    return () => {
      mounted.current = false;
      unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...deps]);

  return { data, loading, error, reload: () => setReloadToken((t) => t + 1) };
}
