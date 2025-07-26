To verify your domain, add the following DNS records in your domain registrar.

| Domain name                          | Type  | Value                                                   |
| ------------------------------------ | ----- | ------------------------------------------------------- |
| doshisensei.com                      | TXT   | v=spf1 include:_spf.firebasemail.com ~all               |
| doshisensei.com                      | TXT   | firebase=doshi-sensei                                   |
| firebase1._domainkey.doshisensei.com | CNAME | mail-doshisensei-com.dkim1._domainkey.firebasemail.com. |
| firebase2._domainkey.doshisensei.com | CNAME | mail-doshisensei-com.dkim2._domainkey.firebasemail.com. |









1. Login to the DNS provider where your domain's **name server** is pointed.

2. Now, add the records from the following table to the DNS settings page Click [here](https://www.zoho.eu/mail/help/adminconsole/configure-email-delivery.html#manual) for detailed instructions.
   
   |          | Record Type | Host             | Value                                                                                                                                                                                                                                      | Priority | Status |
   | -------- | ----------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------ |
   | **MX**   | MX          | @                | mx.zoho.eu                                                                                                                                                                                                                                 | 10       |        |
   | MX       | @           | mx2.zoho.eu      | 20                                                                                                                                                                                                                                         |          |        |
   | MX       | @           | mx3.zoho.eu      | 50                                                                                                                                                                                                                                         |          |        |
   | **SPF**  | TXT         | @                | v=spf1 include:zohomail.eu ~all                                                                                                                                                                                                            | -        |        |
   | **DKIM** | TXT         | zmail._domainkey | v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDhOHNdlNf+w5NDHbsR8ttF3uLxWNGJxcIfx7uecC3eRg0MAFuMM1IHkI73S2z/unbo11+/e2icbhFBgqqLRMh/DIMHo+egEomB18qniKwbsATeuc94nik7OID25FPKyLYCulFmvW2F+Ul05Q6wbWJGJLZtFZppzBBAODKmb73ydwIDAQAB | -        |        |







Enter the application-specific password without spaces in your email clients. The app name **Firebase SMTP** is only for your reference.

App name

Firebase SMTP

Application-Specific Password

T9V0dsUeY7za

Click to Copy

For security reasons this password will not be displayed again.
