import React from "react";
import { StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { adService } from "@/services/ads";

export const AdBanner = (): React.JSX.Element | null => {
  const unitId = adService.getBannerUnitId();
  if (!unitId) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5ecef",
    paddingVertical: 4
  }
});
