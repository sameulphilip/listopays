export const GATEWAY_ORIGIN = "https://pay.listopays.com";
export const PROXY_PREFIX = "/api/checkout/proxy";
export const BRAND_LOGO = "/brand/leez.svg";

export function isPaymentToken(token: string) {
  return /^[A-Za-z0-9_-]{8,128}$/.test(token);
}

export function gatewayPaymentUrl(token: string) {
  return `${GATEWAY_ORIGIN}/payment/${encodeURIComponent(token)}`;
}

export function checkoutPath(token: string) {
  return `/p/${encodeURIComponent(token)}`;
}

export function originFromRequest(request: Request) {
  const configured =
    process.env.CHECKOUT_ORIGIN || process.env.LISTOPAYS_DOMAIN || "";
  if (configured) {
    const value = configured.trim();
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return value.replace(/\/$/, "");
    }
    return `https://${value.replace(/\/$/, "")}`;
  }
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return host ? `${proto}://${host}` : "";
}

export function publicCheckoutUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}${checkoutPath(token)}`;
}

export function withPublicUrl<T extends { token: string; url: string }>(
  payment: T,
  origin: string,
) {
  return {
    ...payment,
    url: publicCheckoutUrl(payment.token, origin),
  };
}

export function rewriteCheckoutHtml(html: string) {
  let next = html.replace(
    /(src|href|srcset)=("|')\/(?!\/)/gi,
    `$1=$2${PROXY_PREFIX}/`,
  );
  next = next.replace(/<title>[^<]*<\/title>/i, "<title>Secure checkout</title>");
  next = next.replace(
    /content="[^"]*(listopay|Listopay)[^"]*"/g,
    'content="Complete your payment."',
  );
  next = next.replaceAll(`${PROXY_PREFIX}/img/logo.png`, BRAND_LOGO);
  next = next.replaceAll("/img/logo.png", BRAND_LOGO);
  next = next.replace("</head>", `${rebrandAssets()}</head>`);
  return next;
}

function rebrandAssets() {
  return `
<link rel="icon" href="${BRAND_LOGO}"/>
<link rel="stylesheet" href="/brand/checkout.css"/>
<script src="/brand/checkout.js" defer></script>
<script>
(function () {
  var PREFIX = ${JSON.stringify(PROXY_PREFIX)};
  var GATEWAY = ${JSON.stringify(GATEWAY_ORIGIN)};
  function rewrite(url) {
    try {
      var u = new URL(String(url), location.origin);
      if (u.pathname.indexOf("/brand/") === 0) return url;
      if (u.hostname === "pay.listopays.com" || u.origin === GATEWAY) {
        return PREFIX + u.pathname + u.search;
      }
      if (u.origin === location.origin && u.pathname.indexOf(PREFIX) !== 0 && u.pathname.indexOf("/p/") !== 0 && u.pathname.indexOf("/brand/") !== 0 && u.pathname.indexOf("/payment/") !== 0) {
        return PREFIX + u.pathname + u.search;
      }
    } catch (e) {}
    return url;
  }
  var rawFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === "string") return rawFetch(rewrite(input), init);
    if (input instanceof Request) return rawFetch(new Request(rewrite(input.url), input), init);
    return rawFetch(input, init);
  };
  var rawOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = rewrite(url);
    return rawOpen.apply(this, args);
  };
})();
</script>
`;
}
