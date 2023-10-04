# 🐢 Turtle

Turtle is a Deno Deploy project that streams random binary data at incredibly slow speeds!

[turtle.deno.dev](https://turtle.deno.dev)

Its purpose is to demonstrate web streams, fetch progress, controllers, and [file storage APIs](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API).

## Notes

The example streams a 10 KB random binary file at 512 bytes per second. It should take around 20 seconds. Storage usage includes downloaded files and other cached assets as reported by the browser.

[Read my blog post for more information.](https://dbushell.com/2023/10/02/storage-apis-downloading-files-for-offline-access/)

* * *

[MIT License](/LICENSE) | Copyright © 2023 [David Bushell](https://dbushell.com)
