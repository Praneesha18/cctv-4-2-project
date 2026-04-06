import os
import cv2


DEFAULT_SCAN_FPS = float(os.getenv("FRAME_SCAN_FPS", "2"))


def extract_frames(video_path, fps=2):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video file: {video_path}")

    frames = []
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps <= 0:
        video_fps = fps or DEFAULT_SCAN_FPS

    scan_fps = max(float(fps or DEFAULT_SCAN_FPS), 0.25)
    interval = max(int(video_fps / scan_fps), 1)

    count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if count % interval == 0:
            timestamp_seconds = (
                count / video_fps if video_fps > 0 else len(frames) / scan_fps
            )
            frames.append(
                {
                    "frame": frame,
                    "frame_index": count,
                    "timestamp_seconds": timestamp_seconds,
                    "quality": {},
                }
            )

        count += 1

    cap.release()

    if not frames:
        raise ValueError("No frames were extracted from the video.")

    return frames
