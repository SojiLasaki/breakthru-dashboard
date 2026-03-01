import { useCallback, useState } from 'react';
import {
  FelixChatError,
  StreamFelixChatHandlers,
  StreamFelixChatRequest,
  formatFelixError,
  streamFelixChat,
} from '@/services/felixChatService';

export const useFelixChat = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const sendStream = useCallback(
    async (request: StreamFelixChatRequest, handlers: StreamFelixChatHandlers = {}) => {
      if (isStreaming) {
        throw new FelixChatError('A request is already in progress.');
      }

      setIsStreaming(true);
      setLastError(null);
      try {
        return await streamFelixChat(request, handlers);
      } catch (error) {
        const message = formatFelixError(error);
        setLastError(message);
        throw error;
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming]
  );

  return { isStreaming, lastError, sendStream };
};
