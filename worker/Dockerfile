FROM eclipse-temurin:17-jdk-jammy
ARG ANDROID_CMDLINE_TOOLS=11076708
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=$ANDROID_SDK_ROOT/cmdline-tools/latest/bin:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/build-tools/35.0.0:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates bash nodejs npm && rm -rf /var/lib/apt/lists/*
RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip" -o /tmp/cmdline-tools.zip && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest && yes | sdkmanager --licenses >/dev/null && sdkmanager "platform-tools" "build-tools;35.0.0"
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@9.12.0 && pnpm install --prod --frozen-lockfile
COPY worker ./worker
RUN chmod +x worker/scripts/process-apk.sh
EXPOSE 8787
CMD ["node", "--import", "tsx", "worker/src/index.ts"]
