import UIKit
import React

/// UIScene yasam dongusu. iOS 27 SDK'si ile derlenen uygulama scene kullanmazsa acilista
/// `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption` ile kapaniyor (28 Eyl 2026,
/// Xcode 27). Expo 55'te hazir bir scene delegate yok; bu sinif pencereyi kurar ve React Native'i
/// baslatir. Uygulama duzeyindeki isler (Expo alt aboneleri, bildirimler, Google girisi) AppDelegate'te
/// kalir; baglantilar buradan AppDelegate'e iletilir.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    // Soguk acilis baglantisi (ozel sema ya da evrensel baglanti) scene ile artik launchOptions'ta
    // gelmiyor; Linking.getInitialURL() launchOptions'tan okudugu icin buradan tasinir.
    var launchOptions = appDelegate.launchOptions ?? [:]
    if let url = connectionOptions.urlContexts.first?.url {
      launchOptions[.url] = url
    }
    if let activity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity,
      ]
    }

    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  // Uygulama acikken gelen ozel sema baglantilari (gghub://, Google girisi donusu).
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let context = URLContexts.first else { return }
    var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    if let source = context.options.sourceApplication {
      options[.sourceApplication] = source
    }
    if let annotation = context.options.annotation {
      options[.annotation] = annotation
    }
    options[.openInPlace] = context.options.openInPlace
    _ = UIApplication.shared.delegate?.application?(UIApplication.shared, open: context.url, options: options)
  }

  // Uygulama acikken gelen evrensel baglantilar.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = UIApplication.shared.delegate?.application?(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in })
  }
}
