/**
 * 语音输入 Hook
 * 使用 expo-audio 处理录音和语音识别
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import { recognizeSpeech } from '../api/asr';
import { showError, showWarning, showSuccess } from '../utils/toast';

export interface UseVoiceInputOptions {
  onTextRecognized?: (text: string) => void;
  appendMode?: boolean; // true: 追加到现有文本, false: 替换
}

export interface UseVoiceInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  recordingDuration: number;
}

export const useVoiceInput = (options: UseVoiceInputOptions = {}): UseVoiceInputReturn => {
  const { onTextRecognized } = options;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCancelledRef = useRef(false);
  const isRecordingRef = useRef(false); // 使用 ref 跟踪录音状态，避免闭包问题
  const onTextRecognizedRef = useRef(onTextRecognized);
  const pendingProcessRef = useRef(false); // 标记是否有待处理的录音
  const lastProcessedUriRef = useRef<string | null>(null); // 记录上次处理的 URI

  // 更新回调函数 ref
  useEffect(() => {
    onTextRecognizedRef.current = onTextRecognized;
  }, [onTextRecognized]);

  // 清理录音时长计时器
  const clearDurationInterval = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    setRecordingDuration(0);
  }, []);

  // 处理录音文件
  const processRecordingFile = useCallback(async (uri: string) => {
    if (!uri) {
      showError({ title: '错误', message: '录音文件获取失败' });
      setIsProcessing(false);
      return;
    }
    
    console.log('[useVoiceInput] 开始处理录音文件 URI:', uri);
    
    try {
      // 调用语音识别 API
      const result = await recognizeSpeech({
        uri,
        type: 'audio/m4a',
        fileName: 'recording.m4a',
      }, 'm4a');

      console.log('[useVoiceInput] 语音识别结果:', result);

      if (result.success && result.text) {
        showSuccess({ title: '识别成功', message: '语音已转换为文字' });
        onTextRecognizedRef.current?.(result.text);
      } else {
        showWarning({ 
          title: '识别结果', 
          message: result.message || '未能识别出有效内容，请重试' 
        });
      }
    } catch (error: any) {
      console.error('[useVoiceInput] 语音识别失败:', error);
      showError({ 
        title: '识别失败', 
        message: error.message || '语音识别失败，请重试' 
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 监听 URI 变化，作为备用处理机制
  useEffect(() => {
    console.log('[useVoiceInput] URI changed:', audioRecorder.uri, 'pending:', pendingProcessRef.current);
    
    // 检查是否需要处理
    if (!pendingProcessRef.current || isCancelledRef.current) {
      return;
    }
    
    // 检查 URI 是否有效且与上次不同
    const uri = audioRecorder.uri;
    if (!uri || uri === lastProcessedUriRef.current) {
      return;
    }

    // 通过 useEffect 触发的处理
    pendingProcessRef.current = false;
    lastProcessedUriRef.current = uri;
    processRecordingFile(uri);
  }, [audioRecorder.uri, processRecordingFile]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearDurationInterval();
    };
  }, [clearDurationInterval]);

  // 开始录音
  const startRecording = useCallback(async () => {
    try {
      // 请求权限
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        showWarning({ title: '权限提示', message: '需要麦克风权限才能录音' });
        return;
      }

      // 设置音频模式，允许录音
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      isCancelledRef.current = false;
      pendingProcessRef.current = false;
      
      // 准备录音
      await audioRecorder.prepareToRecordAsync();
      
      // 开始录音
      audioRecorder.record();
      isRecordingRef.current = true;
      setIsRecording(true);
      
      // 开始计时
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (error) {
      console.error('开始录音失败:', error);
      showError({ title: '录音失败', message: '无法开始录音，请检查权限设置' });
    }
  }, [audioRecorder]);

  // 停止录音并识别
  const stopRecording = useCallback(async () => {
    // 使用 ref 来检查录音状态，避免 audioRecorder.isRecording 不同步的问题
    if (!isRecordingRef.current) return;

    try {
      isRecordingRef.current = false;
      clearDurationInterval();
      setIsRecording(false);
      setIsProcessing(true);

      console.log('[useVoiceInput] 准备停止录音...');

      // 停止录音
      await audioRecorder.stop();
      
      // 检查是否被取消
      if (isCancelledRef.current) {
        setIsProcessing(false);
        return;
      }
      
      // 等待一小段时间让 URI 更新
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const uri = audioRecorder.uri;
      console.log('[useVoiceInput] 录音已停止，URI:', uri);
      
      if (uri && uri !== lastProcessedUriRef.current) {
        lastProcessedUriRef.current = uri;
        await processRecordingFile(uri);
      } else {
        // 如果 URI 没有更新，设置 pending 标志等待 useEffect 处理
        pendingProcessRef.current = true;
        console.log('[useVoiceInput] URI 未立即可用，等待 useEffect 处理...');
        
        // 设置超时保护，防止一直卡在处理中
        setTimeout(() => {
          if (pendingProcessRef.current) {
            console.log('[useVoiceInput] 超时，检查最终 URI:', audioRecorder.uri);
            pendingProcessRef.current = false;
            const finalUri = audioRecorder.uri;
            if (finalUri && finalUri !== lastProcessedUriRef.current) {
              lastProcessedUriRef.current = finalUri;
              processRecordingFile(finalUri);
            } else {
              showError({ title: '错误', message: '录音文件获取超时' });
              setIsProcessing(false);
            }
          }
        }, 3000);
      }

    } catch (error: any) {
      console.error('停止录音失败:', error);
      showError({ 
        title: '录音失败', 
        message: error.message || '停止录音失败，请重试' 
      });
      pendingProcessRef.current = false;
      setIsProcessing(false);
    }
  }, [audioRecorder, clearDurationInterval, processRecordingFile]);

  // 取消录音
  const cancelRecording = useCallback(async () => {
    // 使用 ref 来检查录音状态，避免 audioRecorder.isRecording 不同步的问题
    if (!isRecordingRef.current) return;

    try {
      isCancelledRef.current = true;
      isRecordingRef.current = false;
      pendingProcessRef.current = false;
      clearDurationInterval();
      setIsRecording(false);
      
      await audioRecorder.stop();
    } catch (error) {
      console.error('取消录音失败:', error);
    }
  }, [audioRecorder, clearDurationInterval]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
    recordingDuration,
  };
};
