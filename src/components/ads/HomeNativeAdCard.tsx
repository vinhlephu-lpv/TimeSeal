import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Image, ActivityIndicator } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';
import { useTheme } from '../../theme/ThemeContext';
import { AppIcon, uiShadow } from '../ui/DesignPrimitives';
import { useTranslation } from '../../i18n';
import { ADMOB_NATIVE_AD_UNIT_ID } from '../../config/admob';

export function HomeNativeAdCard() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!ADMOB_NATIVE_AD_UNIT_ID) {
      setLoading(false);
      return;
    }

    NativeAd.createForAdRequest(ADMOB_NATIVE_AD_UNIT_ID)
      .then(ad => {
        if (active) {
          setNativeAd(ad);
          setLoading(false);
        } else {
          ad.destroy();
        }
      })
      .catch(err => {
        console.warn('Failed to load native ad:', err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Cleanup NativeAd instance on unmount
  useEffect(() => {
    return () => {
      if (nativeAd) {
        nativeAd.destroy();
      }
    };
  }, [nativeAd]);

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          styles.loadingCard,
          uiShadow,
          {
            backgroundColor: colors.card,
            borderColor: colors.primarySoft,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedText }]}>
          {t('Đang tải tài trợ...')}
        </Text>
      </View>
    );
  }

  if (!nativeAd) {
    return null;
  }

  const iconUrl = nativeAd.icon?.url;

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.card,
        uiShadow,
        {
          backgroundColor: colors.card,
          borderColor: colors.primarySoft,
        },
      ]}
    >
      <View style={styles.adRow}>
        {/* Ad Icon */}
        {iconUrl ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: iconUrl }} style={styles.icon} />
          </NativeAsset>
        ) : (
          <View style={[styles.iconPlaceholder, { backgroundColor: colors.primarySoft }]}>
            <AppIcon name="sparkles-outline" size={24} color={colors.primary} />
          </View>
        )}

        {/* Ad Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            {/* Headline / Title */}
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {nativeAd.headline}
              </Text>
            </NativeAsset>

            {/* Sponsored Badge */}
            <View style={[styles.sponsoredBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.sponsoredText, { color: colors.primary }]}>
                {t('Tài trợ')}
              </Text>
            </View>
          </View>

          {/* Description / Body */}
          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={[styles.bodyText, { color: colors.mutedText }]} numberOfLines={2}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}

          {/* Call to Action Button */}
          {nativeAd.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <View style={[styles.ctaButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
              </View>
            </NativeAsset>
          ) : null}
        </View>
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20, // Bo góc 20 như yêu cầu
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  loadingCard: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  adRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  icon: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  iconPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  sponsoredBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sponsoredText: {
    fontSize: 10,
    fontWeight: '800',
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
