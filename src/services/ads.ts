import { Platform } from "react-native";
import mobileAds, { AdEventType, InterstitialAd, TestIds } from "react-native-google-mobile-ads";

const IS_ANDROID = Platform.OS === "android";
const BANNER_UNIT_ID = __DEV__ ? TestIds.BANNER : "ca-app-pub-6178487905207895/9206694454";
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : "ca-app-pub-6178487905207895/5729541925";

const DISCOVER_INTERSTITIAL_FREQUENCY = 4;
const DISCOVER_INTERSTITIAL_COOLDOWN_MS = 90 * 1000;

let initialized = false;
let discoverOpenCount = 0;
let lastInterstitialShownAt = 0;
let interstitial: InterstitialAd | null = null;
let interstitialLoaded = false;
let scanInterstitial: InterstitialAd | null = null;
let scanInterstitialLoaded = false;

const loadInterstitial = (): void => {
  if (!IS_ANDROID) {
    return;
  }

  interstitialLoaded = false;
  interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    interstitialLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    lastInterstitialShownAt = Date.now();
    loadInterstitial();
  });

  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    interstitialLoaded = false;
  });

  void interstitial.load();
};

const loadScanInterstitial = (): void => {
  if (!IS_ANDROID) {
    return;
  }

  scanInterstitialLoaded = false;
  scanInterstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true
  });

  scanInterstitial.addAdEventListener(AdEventType.LOADED, () => {
    scanInterstitialLoaded = true;
  });

  scanInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
    loadScanInterstitial();
  });

  scanInterstitial.addAdEventListener(AdEventType.ERROR, () => {
    scanInterstitialLoaded = false;
  });

  void scanInterstitial.load();
};

export const adService = {
  initialize(): void {
    if (!IS_ANDROID || initialized) {
      return;
    }
    initialized = true;
    void mobileAds().initialize();
    loadInterstitial();
    loadScanInterstitial();
  },

  getBannerUnitId(): string | null {
    if (!IS_ANDROID) {
      return null;
    }
    return BANNER_UNIT_ID;
  },

  maybeShowDiscoverInterstitial(): void {
    if (!IS_ANDROID) {
      return;
    }

    this.initialize();
    discoverOpenCount += 1;

    const isCadenceHit = discoverOpenCount % DISCOVER_INTERSTITIAL_FREQUENCY === 0;
    const isCoolingDown = Date.now() - lastInterstitialShownAt < DISCOVER_INTERSTITIAL_COOLDOWN_MS;

    if (!isCadenceHit || isCoolingDown) {
      return;
    }

    if (interstitialLoaded && interstitial) {
      void interstitial.show();
      return;
    }

    if (!interstitial) {
      loadInterstitial();
    }
  },

  showScanInterstitialBeforeNavigate(onComplete: () => void): void {
    if (!IS_ANDROID) {
      onComplete();
      return;
    }

    this.initialize();

    if (!scanInterstitialLoaded || !scanInterstitial) {
      onComplete();
      return;
    }

    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      unsubscribeClosed();
      unsubscribeError();
      onComplete();
    };

    const unsubscribeClosed = scanInterstitial.addAdEventListener(AdEventType.CLOSED, () => {
      finish();
    });
    const unsubscribeError = scanInterstitial.addAdEventListener(AdEventType.ERROR, () => {
      finish();
    });

    scanInterstitialLoaded = false;
    setTimeout(() => {
      finish();
    }, 3500);
    void scanInterstitial.show().catch(() => {
      finish();
    });
  }
};
