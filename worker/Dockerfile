FROM eclipse-temurin:17-jdk-jammy
ARG ANDROID_CMDLINE_TOOLS=11076708
ARG APKTOOL_VERSION=2.9.3
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/35.0.0:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates bash nodejs npm python3 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip" -o /tmp/cmdline-tools.zip && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest && yes | sdkmanager --licenses >/dev/null && sdkmanager "platform-tools" "build-tools;35.0.0"
RUN curl -fsSL "https://github.com/iBotPeaches/Apktool/releases/download/v${APKTOOL_VERSION}/apktool_${APKTOOL_VERSION}.jar" -o /opt/apktool.jar && printf '#!/usr/bin/env bash\nexec java -jar /opt/apktool.jar "$@"\n' > /usr/local/bin/apktool && chmod +x /usr/local/bin/apktool
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.12.0 && pnpm install --frozen-lockfile
COPY worker ./worker
RUN chmod +x worker/scripts/process-apk.sh worker/docker-entrypoint.sh && cp worker/docker-entrypoint.sh /usr/local/bin/apk-protector-worker-entrypoint
EXPOSE 8787
ENTRYPOINT ["/usr/local/bin/apk-protector-worker-entrypoint"]
CMD ["node", "--import", "tsx", "worker/src/index.ts"]
