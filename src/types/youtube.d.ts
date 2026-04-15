// Augment the global Window interface with YouTube IFrame API properties
declare global {
  interface Window {
    YT: typeof YT & {
      PlayerState: typeof YT.PlayerState
    }
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

export {}
