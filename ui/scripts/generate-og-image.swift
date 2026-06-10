import AppKit

let canvasWidth: CGFloat = 1200
let canvasHeight: CGFloat = 630

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> NSColor {
    NSColor(
        calibratedRed: red / 255,
        green: green / 255,
        blue: blue / 255,
        alpha: alpha
    )
}

func font(_ name: String, size: CGFloat, fallbackWeight: NSFont.Weight) -> NSFont {
    NSFont(name: name, size: size) ?? NSFont.systemFont(ofSize: size, weight: fallbackWeight)
}

func drawText(
    _ text: String,
    x: CGFloat,
    top: CGFloat,
    width: CGFloat,
    font: NSFont,
    color: NSColor,
    lineHeight: CGFloat? = nil
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.minimumLineHeight = lineHeight ?? font.pointSize * 1.15
    paragraph.maximumLineHeight = lineHeight ?? font.pointSize * 1.15

    let attributes: [NSAttributedString.Key: Any] = [
        .font: font,
        .foregroundColor: color,
        .paragraphStyle: paragraph,
    ]
    let attributed = NSAttributedString(string: text, attributes: attributes)
    let measured = attributed.boundingRect(
        with: NSSize(width: width, height: canvasHeight),
        options: [.usesLineFragmentOrigin, .usesFontLeading]
    )
    let rect = NSRect(
        x: x,
        y: canvasHeight - top - ceil(measured.height),
        width: width,
        height: ceil(measured.height)
    )
    attributed.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading])
}

func drawImageAspectFill(_ image: NSImage, in rect: NSRect, cornerRadius: CGFloat) {
    let clipPath = NSBezierPath(roundedRect: rect, xRadius: cornerRadius, yRadius: cornerRadius)
    NSGraphicsContext.saveGraphicsState()
    clipPath.addClip()

    let imageSize = image.size
    let scale = max(rect.width / imageSize.width, rect.height / imageSize.height)
    let drawSize = NSSize(width: imageSize.width * scale, height: imageSize.height * scale)
    let drawRect = NSRect(
        x: rect.midX - drawSize.width / 2,
        y: rect.midY - drawSize.height / 2,
        width: drawSize.width,
        height: drawSize.height
    )
    image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
}

let scriptURL = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
let uiURL = scriptURL.deletingLastPathComponent().deletingLastPathComponent()
let assetsURL = uiURL.appendingPathComponent("src/core/assets")
let outputURL = uiURL.appendingPathComponent("public/og/gghub-social-v2.png")

func load(_ name: String) -> NSImage {
    let url = assetsURL.appendingPathComponent(name)
    guard let image = NSImage(contentsOf: url) else {
        fputs("Could not load image at \(url.path)\n", stderr)
        exit(1)
    }
    return image
}

let logo = load("logo2.png")
let mark = load("logo.png")
let games = load("games 7.png")

guard
    let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(canvasWidth),
        pixelsHigh: Int(canvasHeight),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ),
    let graphicsContext = NSGraphicsContext(bitmapImageRep: bitmap)
else {
    fputs("Could not create social image canvas\n", stderr)
    exit(1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = graphicsContext

let background = NSGradient(colors: [
    color(5, 10, 27),
    color(12, 11, 35),
    color(16, 7, 37),
])!
background.draw(in: NSRect(x: 0, y: 0, width: canvasWidth, height: canvasHeight), angle: 0)

color(67, 214, 255, 0.09).setStroke()
for x in stride(from: CGFloat(0), through: canvasWidth, by: 64) {
    let line = NSBezierPath()
    line.move(to: NSPoint(x: x, y: 0))
    line.line(to: NSPoint(x: x, y: canvasHeight))
    line.lineWidth = 1
    line.stroke()
}
for y in stride(from: CGFloat(0), through: canvasHeight, by: 64) {
    let line = NSBezierPath()
    line.move(to: NSPoint(x: 0, y: y))
    line.line(to: NSPoint(x: canvasWidth, y: y))
    line.lineWidth = 1
    line.stroke()
}

let cyanGlow = NSGradient(colors: [color(0, 217, 255, 0.28), color(0, 217, 255, 0)])!
cyanGlow.draw(in: NSRect(x: -150, y: 330, width: 520, height: 520), relativeCenterPosition: .zero)
let purpleGlow = NSGradient(colors: [color(176, 38, 255, 0.24), color(176, 38, 255, 0)])!
purpleGlow.draw(in: NSRect(x: 900, y: -150, width: 520, height: 520), relativeCenterPosition: .zero)

logo.draw(
    in: NSRect(x: 72, y: 493, width: 320, height: 80),
    from: .zero,
    operation: .sourceOver,
    fraction: 1
)

drawText(
    "OYUNCU SOSYAL PLATFORMU",
    x: 74,
    top: 148,
    width: 530,
    font: font("Avenir Next Demi Bold", size: 17, fallbackWeight: .semibold),
    color: color(63, 220, 255)
)
drawText(
    "Oyunun Kalbi\nBurada Atıyor",
    x: 70,
    top: 190,
    width: 560,
    font: font("Avenir Next Bold", size: 58, fallbackWeight: .bold),
    color: color(245, 247, 255),
    lineHeight: 64
)
drawText(
    "Oyunları keşfet, puanla, listeler oluştur ve oyuncu topluluğuna katıl.",
    x: 74,
    top: 342,
    width: 530,
    font: font("Avenir Next Regular", size: 25, fallbackWeight: .regular),
    color: color(187, 196, 218),
    lineHeight: 35
)

let features = ["Keşfet", "Puanla", "Listele", "Paylaş"]
let featureColors = [
    color(0, 217, 255),
    color(82, 128, 255),
    color(144, 77, 255),
    color(218, 34, 255),
]
var pillX: CGFloat = 72
for (index, feature) in features.enumerated() {
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font("Avenir Next Medium", size: 15, fallbackWeight: .medium),
        .foregroundColor: featureColors[index],
    ]
    let textSize = feature.size(withAttributes: attributes)
    let pillRect = NSRect(x: pillX, y: 82, width: textSize.width + 28, height: 36)
    let pill = NSBezierPath(roundedRect: pillRect, xRadius: 18, yRadius: 18)
    featureColors[index].withAlphaComponent(0.12).setFill()
    pill.fill()
    featureColors[index].withAlphaComponent(0.38).setStroke()
    pill.lineWidth = 1
    pill.stroke()
    feature.draw(
        at: NSPoint(x: pillRect.minX + 14, y: pillRect.minY + 9),
        withAttributes: attributes
    )
    pillX += pillRect.width + 10
}

drawText(
    "gghub.social",
    x: 74,
    top: 572,
    width: 400,
    font: font("Menlo Regular", size: 17, fallbackWeight: .medium),
    color: color(119, 132, 166)
)

let visualRect = NSRect(x: 668, y: 54, width: 472, height: 522)
let shadow = NSShadow()
shadow.shadowColor = color(0, 217, 255, 0.18)
shadow.shadowBlurRadius = 36
shadow.shadowOffset = NSSize(width: 0, height: -8)

let visualPath = NSBezierPath(roundedRect: visualRect, xRadius: 38, yRadius: 38)
NSGraphicsContext.saveGraphicsState()
shadow.set()
color(9, 13, 32).setFill()
visualPath.fill()
NSGraphicsContext.restoreGraphicsState()

drawImageAspectFill(games, in: visualRect, cornerRadius: 38)

NSGraphicsContext.saveGraphicsState()
visualPath.addClip()
let overlay = NSGradient(colors: [
    color(5, 10, 27, 0.08),
    color(5, 10, 27, 0.28),
    color(5, 10, 27, 0.78),
])!
overlay.draw(in: visualRect, angle: -90)
NSGraphicsContext.restoreGraphicsState()

let markRect = NSRect(x: 970, y: 78, width: 128, height: 103)
let markBackground = NSBezierPath(roundedRect: markRect.insetBy(dx: -16, dy: -14), xRadius: 24, yRadius: 24)
color(6, 10, 28, 0.72).setFill()
markBackground.fill()
mark.draw(in: markRect, from: .zero, operation: .sourceOver, fraction: 1)

let brandWash = NSGradient(colors: [
    color(0, 217, 255, 0.82),
    color(94, 98, 255, 0.72),
    color(218, 34, 255, 0.82),
])!
brandWash.draw(in: visualPath, angle: 20)
color(88, 202, 255, 0.72).setStroke()
visualPath.lineWidth = 2
visualPath.stroke()

NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fputs("Could not encode social image\n", stderr)
    exit(1)
}

try png.write(to: outputURL)
print("Wrote \(outputURL.path)")
