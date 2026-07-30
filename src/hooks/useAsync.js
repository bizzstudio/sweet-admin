import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { SidebarContext } from "@/context/SidebarContext";

const useAsync = (asyncFunction) => {
  const [data, setData] = useState([] || {});
  const [error, setError] = useState("");
  // const [errCode, setErrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const {
    invoice,
    statuses,
    zone,
    time,
    source,
    limitData,
    startDate,
    endDate,
    method,
    isUpdate,
    setIsUpdate,
    currentPage,
    category,
    searchText,
    sortedField,
    cities,
  } = useContext(SidebarContext);

  useEffect(() => {
    let unmounted = false;
    let source = axios.CancelToken.source();
    let debounceTimeout;

    const fetchData = async () => {
      try {
        const res = await asyncFunction({ cancelToken: source.token });
        if (!unmounted) {
          setData(res);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (!unmounted) {
          setError(err.message);
          if (axios.isCancel(err)) {
            setError(err.message);
            setLoading(false);
            setData([]);
          } else {
            setError(err.message);
            setLoading(false);
            setData([]);
          }
        }
      }
    };

    debounceTimeout = setTimeout(fetchData, 1000);

    setIsUpdate(false);

    return () => {
      unmounted = true;
      source.cancel("Cancelled in cleanup");
      clearTimeout(debounceTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    invoice,
    statuses,
    zone,
    time,
    method,
    source,
    limitData,
    startDate,
    endDate,
    isUpdate,
    currentPage,
    category,
    searchText,
    sortedField,
    cities,
  ]);

  return {
    data,
    error,
    loading,
  };
};

export default useAsync;
