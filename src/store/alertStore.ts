import { create } from 'zustand';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  type: AlertType;
  buttons: AlertButton[];
  options: AlertOptions;
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
    type?: AlertType
  ) => void;
  hide: () => void;
}

// Hàm phụ để đoán loại alert dựa trên nội dung tiêu đề hoặc nút bấm
const inferAlertType = (
  title: string,
  message: string,
  buttons?: AlertButton[],
  passedType?: AlertType
): AlertType => {
  if (passedType) return passedType;

  const lowerTitle = title.toLowerCase();
  const lowerMsg = message.toLowerCase();

  // Kiểm tra lỗi trước
  if (
    lowerTitle.includes('lỗi') || 
    lowerTitle.includes('thất bại') || 
    lowerTitle.includes('error') || 
    lowerTitle.includes('failed') || 
    lowerTitle.includes('không thể') ||
    lowerMsg.includes('không thể') ||
    lowerMsg.includes('thất bại')
  ) {
    return 'error';
  }

  // Thành công
  if (
    lowerTitle.includes('thành công') || 
    lowerTitle.includes('đã xóa') || 
    lowerTitle.includes('success') || 
    lowerTitle.includes('đã lưu') || 
    lowerTitle.includes('đã dọn')
  ) {
    return 'success';
  }

  // Cảnh báo hoặc xác nhận (nếu có nhiều nút bấm)
  if (buttons && buttons.length > 1) {
    return 'confirm';
  }

  if (
    lowerTitle.includes('cảnh báo') || 
    lowerTitle.includes('warning') || 
    lowerTitle.includes('nhắc nhở') ||
    lowerTitle.includes('chú ý')
  ) {
    return 'warning';
  }

  return 'info';
};

export const useAlertStore = create<AlertState>((set) => ({
  visible: false,
  title: '',
  message: '',
  type: 'info',
  buttons: [],
  options: {},
  show: (title, message = '', buttons = [], options = {}, type) => {
    // Đoán type nếu không được truyền vào rõ ràng
    const inferredType = inferAlertType(title, message, buttons, type);
    
    // Nếu không có nút bấm nào, mặc định hiển thị nút OK để đóng
    const finalButtons = buttons.length > 0 
      ? buttons 
      : [{ text: 'OK', style: 'default' as const }];

    set({
      visible: true,
      title,
      message,
      buttons: finalButtons,
      options,
      type: inferredType,
    });
  },
  hide: () => {
    set({ visible: false });
  },
}));

// Helper tĩnh để gọi từ bất kỳ đâu (kể cả file .ts thuần túy) mà không cần hooks
export const PolishedAlert = {
  show: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions,
    type?: AlertType
  ) => {
    useAlertStore.getState().show(title, message, buttons, options, type);
  },
  hide: () => {
    useAlertStore.getState().hide();
  },
};
