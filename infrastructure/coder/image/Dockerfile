# syntax=docker/dockerfile:1.7
# Lab workspace image for the Coder guided inspection lab (ADR-0023). Tools only — NO credentials, NO cloud access configured.
# NOTE: pin by digest before production use (VALIDATION.md).
FROM codercom/enterprise-base:ubuntu
USER root
ARG TERRAFORM_VERSION=1.9.8
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates gnupg lsb-release jq git \
 && curl -fsSL "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" -o /tmp/tf.zip \
 && unzip -q /tmp/tf.zip -d /usr/local/bin && rm /tmp/tf.zip \
 && curl -fsSL https://aka.ms/InstallAzureCLIDeb | bash \
 && curl -fsSL https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb -o /tmp/ms.deb && dpkg -i /tmp/ms.deb && rm /tmp/ms.deb \
 && apt-get update && apt-get install -y --no-install-recommends powershell \
 && curl -fsSL https://code-server.dev/install.sh | sh \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
# Guard rails: block interactive logins so a learner cannot accidentally authenticate the shared image's tooling.
RUN printf '#!/bin/sh\necho "This lab workspace has no cloud access by design. Run az/pwsh cloud commands from your own machine." >&2\nexit 1\n' > /usr/local/bin/az-login-blocked && chmod +x /usr/local/bin/az-login-blocked \
 && echo 'alias "az login"="az-login-blocked"' >> /etc/bash.bashrc
USER coder
WORKDIR /home/coder
