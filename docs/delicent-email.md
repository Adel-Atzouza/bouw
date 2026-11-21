# Enquiry email on Ubuntu

The website uses local Postfix's `/usr/sbin/sendmail`, without a paid API or SMTP password. Notifications go to **info@delicent.nl**, from `website@delicent.nl`; Reply-To is the customer's address. The message includes the enquiry reference, contact details, service, location and plans. It sends no automatic customer email.

The Ubuntu server is not configured by this repository. A real mailbox for `info@delicent.nl` must exist: an outbound Postfix installation does not create that inbox. If there is no mailbox yet, set up local mailbox delivery or an existing mail host separately before testing.

## Deployment on 21 November 2026

The application update is deployed on `91.98.16.56` in `/var/www/bouwbedrijf` (`bouwbedrijf.service`). Postfix and OpenDKIM are installed and running with loopback-only listeners. Outbound delivery uses IPv4; Cloudflare rejected the server's IPv6 reverse DNS. The SMTP hostname is the existing `forum.tarifiyt.com`, which matches the IPv4 PTR and forward DNS, while mail is signed for `delicent.nl`.

Email is **enabled** in `.env.local`. The [SPF and DKIM records](delicent-dns.txt) were verified against both authoritative Cloudflare nameservers, and `opendkim-testkey` verified the public key. A test through the public `/api/enquiry` endpoint returned `DEL-2B821681E4C432FF` on 21 November 2026 at 17:53 UTC. Postfix added the DKIM signature and Cloudflare's recipient mail server accepted the message for `info@delicent.nl` with `250 2.0.0 Ok` (queue ID `AC40A38D7`). Final arrival in the forwarded Gmail inbox has not been independently confirmed. The `delicent-enquiry-retry.timer` runs every five minutes; its service skips processing if email is subsequently disabled.

The pre-deployment source/build backup is `/root/delicent-release-before-email-20261121173439`. Mail configuration backups are in `/root/delicent-mail-config-backup`. The DKIM private key stays in `/etc/opendkim/keys/delicent.nl/website2026.private`; only its public DNS record is in this repository. The GitHub deployment workflow deploys source from `main`; server environment settings, mail configuration and private enquiry data remain outside Git.

## Server setup

These steps assume a dedicated Ubuntu application server running Node directly, with the recipient mailbox hosted elsewhere. If the server already handles incoming mail, preserve its existing mail configuration. For a container deployment, Postfix must be reachable within that deployment; the host's sendmail path is not automatically available in a container.

1. Confirm the hosting provider allows outbound TCP port 25. Direct delivery will not work when it is blocked; ask the host to unblock it or use an available SMTP relay.
2. Point a mail hostname, for example `mail.delicent.nl`, at the server IP. Ask the host to set reverse DNS (PTR) to that hostname. Keep the existing MX records for the receiving mailbox.
3. Install Postfix:

   ```bash
   sudo apt update
   sudo apt install postfix
   ```

   Choose **Internet Site**, with `delicent.nl` as the system mail name. For this dedicated outbound server, configure:

   ```bash
   sudo postconf -e 'myhostname = mail.delicent.nl'
   sudo postconf -e 'myorigin = delicent.nl'
   sudo postconf -e 'inet_interfaces = loopback-only'
   sudo postconf -e 'mynetworks = 127.0.0.0/8 [::1]/128'
   sudo postconf -e 'mydestination = $myhostname, localhost.localdomain, localhost'
   sudo postconf -e 'relayhost ='
   sudo postconf -e 'smtp_tls_security_level = may'
   sudo postfix check
   sudo systemctl restart postfix
   ```

   `delicent.nl` is deliberately excluded from `mydestination` here, so mail to the external `info@delicent.nl` inbox follows its MX records. Local hosting of that inbox needs a different configuration. The loopback setting keeps the SMTP listener private.

4. Authorize the outbound server IP in the domain's existing SPF record; do not publish multiple SPF records. Configure DKIM signing (for example OpenDKIM) and publish its public key, plus an appropriate DMARC record. Review existing records before editing them. Configure a monitored destination for bounces to `website@delicent.nl`.
5. In the app's `.env.local`, or its process manager's environment, set:

   ```dotenv
   DELICENT_EMAIL_ENABLED=true
   DELICENT_SENDMAIL_PATH=/usr/sbin/sendmail
   DELICENT_ENQUIRY_DIR=/var/lib/delicent/enquiries
   ```

   Create the private enquiry directory with ownership assigned to the application's Unix user and mode `0700`. The same user must be allowed to submit mail through Postfix. Restart the application after setting the environment. Use a current Node 22 LTS release (22.15+ for the maintenance script's module hooks) or Node 24 LTS.

## Verify and maintain

Submit a clearly labelled test through “Verstuur mijn plannen” and check the actual inbox and spam folder. A website receipt confirms saved data; `queued` confirms only the local handoff. Verify the email's Reply-To and all submitted details.

Run from the application directory, as the application user with the same environment:

```bash
npm run enquiries -- status
npm run enquiries -- retry-pending
```

`status` lists references and notification state without printing customer details. `retry-pending` queues saved requests whose notification has not yet been queued, including older records with no email status. Successful handoffs are skipped. The command exits nonzero if an attempt remains pending. Schedule it periodically under the application user if automatic recovery is needed; no scheduler is installed by the app.

Postfix manages delivery and transient retries after handoff. Inspect its queue and logs:

```bash
mailq
sudo journalctl -u postfix --since '30 minutes ago'
```

Depending on logging configuration, also inspect `/var/log/mail.log`. Check for deferred mail, bounces and final delivery; the app has no inbox-delivery tracking.

A per-enquiry `.email.lock` prevents concurrent submissions/retries from queuing duplicate notifications. A process crash can leave this lock behind. Before removing a stale lock, stop the relevant process and inspect the Postfix queue/logs using the deterministic Message-ID (`<DEL-…@delicent.nl>`). A crash after Postfix accepted a message but before the website recorded that fact can cause a duplicate on retry. Never blindly retry such records. Saved enquiry data remains available.

Delete stored enquiry notifications, mailbox copies and backups according to the site's retention policy.

References: [Ubuntu Postfix installation and configuration](https://ubuntu.com/server/docs/how-to/mail-services/install-postfix/) and [Postfix sendmail interface](https://www.postfix.org/sendmail.1.html).
