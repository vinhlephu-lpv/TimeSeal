import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
  Dimensions,
  BackHandler,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { AppIcon, uiShadow } from './DesignPrimitives';
import { useAlertStore, AlertButton } from '../../store/alertStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function PolishedAlert() {
  const { colors, isDark } = useTheme();
  const { visible, title, message, type, buttons, options, hide } = useAlertStore();
  
  // State nội bộ để đồng bộ hóa việc đóng modal sau khi chạy xong animation ẩn
  const [active, setActive] = useState(false);

  // Reanimated Shared Values - Rút ngắn khoảng cách ban đầu để giảm chuyển động
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.96);
  const translateY = useSharedValue(15);

  // Đồng bộ trạng thái visible của store và chạy animation - Chuyển sang timing nhanh, mượt mà và êm ái hơn
  useEffect(() => {
    if (visible) {
      setActive(true);
      // Mở modal: timing cực kỳ êm dịu, không giật nảy
      backdropOpacity.value = withTiming(0.45, { duration: 180 });
      scale.value = withTiming(1, { duration: 180 });
      translateY.value = withTiming(0, { duration: 180 });
    } else if (active) {
      // Đóng modal: trượt ngược tinh tế
      backdropOpacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.96, { duration: 150 });
      translateY.value = withTiming(10, { duration: 150 }, (finished) => {
        if (finished) {
          runOnJS(setActive)(false);
        }
      });
    }
  }, [visible, active]);

  // Lắng nghe nút Back trên Android để đóng Alert nếu cho phép cancelable
  useEffect(() => {
    const handleBackButton = () => {
      if (active) {
        if (options.cancelable !== false) {
          handleDismiss();
        }
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      subscription.remove();
    };
  }, [active, options.cancelable]);

  const handleDismiss = () => {
    hide();
    if (options.onDismiss) {
      options.onDismiss();
    }
  };

  const handleButtonPress = (btn: AlertButton) => {
    hide();
    if (btn.onPress) {
      // Đợi animation đóng bắt đầu để tạo cảm giác mượt mà hơn
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  // Lấy màu sắc và icon phù hợp với loại Alert
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: colors.success,
          bgColor: colors.tealSoft || '#E8F8F5',
        };
      case 'error':
        return {
          icon: 'close-circle',
          iconColor: colors.danger,
          bgColor: isDark ? '#3D1C1B' : '#FDEDEC',
        };
      case 'warning':
        return {
          icon: 'warning',
          iconColor: colors.warning,
          bgColor: isDark ? '#3E2A15' : '#FEF5E7',
        };
      case 'confirm':
        return {
          icon: 'help-circle',
          iconColor: colors.primary,
          bgColor: colors.primarySoft || '#F4F3FB',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle',
          iconColor: colors.info || '#185FA5',
          bgColor: colors.infoLight || '#EBF5FB',
        };
    }
  };

  const config = getTypeConfig();

  // Định nghĩa Styles cho Reanimated
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedDialogStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const renderButtons = () => {
    if (!buttons || buttons.length === 0) return null;

    // Sắp xếp các nút: nếu có 2 nút, xếp song song
    if (buttons.length === 2) {
      const cancelBtn = buttons.find(b => b.style === 'cancel') || buttons[0];
      const actionBtn = buttons.find(b => b.style !== 'cancel') || buttons[1];

      return (
        <View style={styles.rowButtons}>
          <Pressable
            onPress={() => handleButtonPress(cancelBtn)}
            style={({ pressed }) => [
              styles.btn,
              styles.btnCancel,
              { borderColor: colors.softBorder, backgroundColor: colors.card },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.btnTextCancel, { color: colors.mutedText }]}>
              {cancelBtn.text}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleButtonPress(actionBtn)}
            style={({ pressed }) => [
              styles.btn,
              actionBtn.style === 'destructive'
                ? { backgroundColor: colors.danger }
                : { backgroundColor: colors.primary },
              pressed && styles.pressed,
              uiShadow,
            ]}
          >
            <Text style={styles.btnTextAction}>{actionBtn.text}</Text>
          </Pressable>
        </View>
      );
    }

    // Nếu nhiều hơn 2 nút hoặc chỉ 1 nút, xếp hàng dọc
    return (
      <View style={styles.columnButtons}>
        {buttons.map((btn, index) => {
          const isCancel = btn.style === 'cancel';
          const isDestructive = btn.style === 'destructive';

          return (
            <Pressable
              key={index}
              onPress={() => handleButtonPress(btn)}
              style={({ pressed }) => [
                styles.btn,
                isCancel
                  ? [styles.btnCancel, { borderColor: colors.softBorder, backgroundColor: colors.card }]
                  : isDestructive
                  ? { backgroundColor: colors.danger }
                  : { backgroundColor: colors.primary },
                pressed && styles.pressed,
                !isCancel && uiShadow,
              ]}
            >
              <Text
                style={[
                  isCancel ? [styles.btnTextCancel, { color: colors.mutedText }] : styles.btnTextAction,
                ]}
              >
                {btn.text}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  if (!active) return null;

  return (
    <Modal
      transparent
      visible={active}
      animationType="none"
      onRequestClose={() => {
        if (options.cancelable !== false) {
          handleDismiss();
        }
      }}
    >
      <View style={styles.container}>
        {/* Backdrop mờ */}
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, animatedBackdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (options.cancelable !== false) {
                handleDismiss();
              }
            }}
          />
        </Animated.View>

        {/* Dialog chính */}
        <Animated.View
          style={[
            styles.dialog,
            { backgroundColor: colors.card, borderColor: colors.softBorder },
            animatedDialogStyle,
          ]}
        >
          {/* Header Icon - Hiển thị logo app với viền màu tương ứng loại Alert */}
          <View style={[
            styles.iconWrapper, 
            { 
              backgroundColor: config.bgColor,
              borderColor: config.iconColor,
              borderWidth: 2,
            }
          ]}>
            <Image
              source={require('../../assets/icon-app/Icon-app.png')}
              style={{ width: 42, height: 42 }}
              resizeMode="contain"
            />
          </View>

          {/* Nội dung chữ */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {message ? (
              <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text>
            ) : null}
          </View>

          {/* Các nút điều hướng */}
          {renderButtons()}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdrop: {
    backgroundColor: '#000000',
  },
  dialog: {
    width: Math.min(SCREEN_WIDTH - 48, 340),
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 60, // Đẩy thông báo lên cao một chút để cân đối và dễ nhìn hơn
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 6,
  },
  rowButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  columnButtons: {
    width: '100%',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnCancel: {
    borderWidth: 1.2,
  },
  btnTextAction: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnTextCancel: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
