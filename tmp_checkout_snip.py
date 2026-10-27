import urllib.request

url = "https://listopays.doubleclickds.com/payment/5Nsz7t6ZFC9zc9ARXoGkJFrZuVDFJNHa"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
html = urllib.request.urlopen(req, timeout=25).read().decode("utf-8", "replace")
print("checkout.css", "/brand/checkout.css" in html)
print("checkout.js", "/brand/checkout.js" in html)
print("title leez", "<title>Leez Pay</title>" in html)
print("listopay title", "Listopay - Secure" in html)
print("logo.png", "/brand/logo.png" in html)
print("leez-wordmark", "leez-wordmark" in html)
print("446CFF", "446CFF" in html)
