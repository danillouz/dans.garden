---
title: Caddy local CA
description: Firefox does not recognize Caddy's local Certificate Authority by default.
date: 2023-06-23
tags:
  - evergreen
---

When running [Caddy](https://caddyserver.com/) locally, it will also generate its own local Certificate Authority (CA). Caddy will use this CA to sign certificates for [local HTTPS](https://caddyserver.com/docs/automatic-https#local-https).

This is pretty cool! But Caddy's local HTTPS does not work in Firefox by default. When running Caddy on `localhost`, Firefox will show the error code `SEC_ERROR_UNKNOWN_ISSUER` when visiting `https://localhost` (other browsers like Safari don't have this issue).

![[_assets/Caddy local CA/Error.png]]

Turns out that Firefox [does not recognize](https://caddy.community/t/ocsp-stapling-error-certificate-not-trusted-by-the-web-browser/7691/2) Caddy's local CA by default. And you have to [manually import](https://support.mozilla.org/en-US/questions/1175296) Caddy's local root certificate into Firefox.

## How to import Caddy's local root certificate into Firefox?

1. Open Firefox and go to `about:preferences#privacy`.

2. Scroll down to the `Security > Certificates` section, and click `View Certificates`.

![[_assets/Caddy local CA/2 settings.png]]

3. Select the `Authorities` tab, and click `Import`.

![[_assets/Caddy local CA/3 import.png]]

4. Find Caddy's local root certificate in its [data directory](https://caddyserver.com/docs/conventions#data-directory), and open it. On a Mac it's located at `~/Library/Application\ Support/Caddy/pki/authorities/local/root.crt`.

![[_assets/Caddy local CA/4 open.png]]

5. Check the `Trust this CA to identify websites` checkbox, and click `OK`.

![[_assets/Caddy local CA/5 trust.png]]

6. The `Caddy Local Authority` should now be listed in the `Authorities` tab.

![[_assets/Caddy local CA/6 imported.png]]

7. Restart Firefox, and accessing localhost over HTTPS will now work!
