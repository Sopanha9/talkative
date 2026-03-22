function normalizeTypeValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function looksLikeVoiceName(channel) {
  const name = normalizeTypeValue(channel?.title || channel?.name);
  if (!name) {
    return false;
  }

  return /\b(voice|voices|vc|call|lounge)\b/.test(name);
}

export function getChannelType(channel) {
  if (!channel || typeof channel !== "object") {
    return "unknown";
  }

  if (channel.isVoice === true || channel.voice === true) {
    return "voice";
  }

  const candidates = [
    channel.type,
    channel.category,
    channel.channelType,
    channel.kind,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeTypeValue(candidate);

    if (!normalized) {
      continue;
    }

    if (normalized.includes("voice")) {
      return "voice";
    }

    if (normalized.includes("text") || normalized.includes("chat")) {
      return "text";
    }
  }

  if (looksLikeVoiceName(channel)) {
    return "voice";
  }

  return "unknown";
}

export function isVoiceChannel(channel) {
  return getChannelType(channel) === "voice";
}

export function isTextChannel(channel) {
  const type = getChannelType(channel);
  return type === "text" || type === "unknown";
}
