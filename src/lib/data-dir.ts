import path from 'path'

export function getDataDir(): string {
  return process.env.LINGOFLOW_DATA_DIR ?? path.join(process.cwd(), '.lingoflow-data')
}

export function getTranscriptsDir(): string {
  return path.join(getDataDir(), 'transcripts')
}

export function getVideosDir(): string {
  return path.join(getDataDir(), 'videos')
}

export function getThumbnailsDir(): string {
  return path.join(getDataDir(), 'thumbnails')
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'lingoflow.db')
}
