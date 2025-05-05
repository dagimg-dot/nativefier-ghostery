# Nativefier with Adblocker

A simple tool to build a Nativefier application for a given URL with the Ghostery adblocker automatically injected.

## Installation

```bash
npm install -g nativefier-with-adblocker # Or your package name
# OR
npx nativefier-with-adblocker <url> [options]
```

## Usage

```bash
create-native-app-with-adblocker <target-url> --name "MyAppName" [other-nativefier-options]
```

Replace `<target-url>` with the website you want to wrap and `"MyAppName"` with your desired application name.
Any additional flags will be passed directly to Nativefier.

## Development

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run build -- <url> --name "TestApp"` to test locally.

## License

MIT 