# txio Desktop

The txio web app, wrapped as a desktop binary. Same API client, same visual transaction builder for Sui — just outside the browser.

Built on Electron, packaged for Linux/macOS/Windows via `electron-builder`.

## Building

From the repo root:

```bash
npm run build
```

That runs the frontend build, copies the output into `desktop/dist/`, and hands off to `electron-builder` to package the executables.

## License

MIT. See [LICENSE](LICENSE).
