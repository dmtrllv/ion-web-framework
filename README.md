# IDEAS:

// This will only work after i added ts-loaders that will resolve all classes and dependencies.

```ts
@configProvider(HttpTransport)
class HttpConfigProvider extends ConfigProvider<HttpTransportConfig> {
	public override provide(): HttpTransportConfig {
		return {
			host: "127.0.0.1",
			port: env.isDev ? 3001 : 443,
		}
	}
}
```