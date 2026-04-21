import os
import cv2
import numpy as np


DEFAULT_SCAN_FPS = float(os.getenv("FRAME_SCAN_FPS", "2"))
MOTION_HISTORY = int(os.getenv("MOTION_HISTORY", "500"))
MOTION_VAR_THRESHOLD = float(os.getenv("MOTION_VAR_THRESHOLD", "16"))
MOTION_PIXEL_RATIO_THRESHOLD = float(
    os.getenv("MOTION_PIXEL_RATIO_THRESHOLD", "0.01")
)
STATIC_KEEP_INTERVAL_SECONDS = float(
    os.getenv("STATIC_KEEP_INTERVAL_SECONDS", "1.0")
)
DYNAMIC_KEEP_INTERVAL_SECONDS = float(
    os.getenv("DYNAMIC_KEEP_INTERVAL_SECONDS", "0.75")
)
CAMERA_MOTION_DIFF_THRESHOLD = float(
    os.getenv("CAMERA_MOTION_DIFF_THRESHOLD", "8.0")
)
MIN_BLUR_SCORE = float(os.getenv("MIN_BLUR_SCORE", "100"))
MIN_BRIGHTNESS = float(os.getenv("MIN_BRIGHTNESS", "40"))
MAX_BRIGHTNESS = float(os.getenv("MAX_BRIGHTNESS", "220"))
MIN_CONTRAST_STD = float(os.getenv("MIN_CONTRAST_STD", "20"))
MOTION_SCORE_WEIGHT = float(os.getenv("MOTION_SCORE_WEIGHT", "0.35"))
BLUR_SCORE_WEIGHT = float(os.getenv("BLUR_SCORE_WEIGHT", "0.40"))
CONTRAST_SCORE_WEIGHT = float(os.getenv("CONTRAST_SCORE_WEIGHT", "0.25"))
MIN_QUALITY_SCORE = float(os.getenv("MIN_QUALITY_SCORE", "0.18"))
DETECT_SHADOWS = os.getenv("MOTION_DETECT_SHADOWS", "true").lower() == "true"


def _build_background_subtractor():
    return cv2.createBackgroundSubtractorMOG2(
        history=MOTION_HISTORY,
        varThreshold=MOTION_VAR_THRESHOLD,
        detectShadows=DETECT_SHADOWS,
    )


def _foreground_mask(background_subtractor, frame):
    foreground_mask = background_subtractor.apply(frame)

    # Shadows are marked as gray; keep only strong foreground pixels.
    _, foreground_mask = cv2.threshold(foreground_mask, 250, 255, cv2.THRESH_BINARY)

    kernel = np.ones((3, 3), np.uint8)
    foreground_mask = cv2.morphologyEx(foreground_mask, cv2.MORPH_OPEN, kernel)
    foreground_mask = cv2.morphologyEx(foreground_mask, cv2.MORPH_DILATE, kernel)
    return foreground_mask


def _frame_gray_and_diff(previous_gray, frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    if previous_gray is None:
        return gray, gray, 0.0

    frame_diff = float(cv2.absdiff(gray, previous_gray).mean())
    return gray, gray, frame_diff


def _frame_quality_metrics(gray):
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    contrast_std = float(gray.std())
    return blur_score, brightness, contrast_std


def _normalized_quality_score(motion_ratio, blur_score, contrast_std):
    motion_component = min(
        max(motion_ratio / max(MOTION_PIXEL_RATIO_THRESHOLD, 1e-6), 0.0),
        3.0,
    ) / 3.0
    blur_component = min(max(blur_score / max(MIN_BLUR_SCORE, 1.0), 0.0), 3.0) / 3.0
    contrast_component = min(
        max(contrast_std / max(MIN_CONTRAST_STD, 1.0), 0.0),
        3.0,
    ) / 3.0

    return (
        motion_component * MOTION_SCORE_WEIGHT
        + blur_component * BLUR_SCORE_WEIGHT
        + contrast_component * CONTRAST_SCORE_WEIGHT
    )


def extract_frames(video_path, fps=2):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Unable to open video file: {video_path}")

    try:
        frames = []
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if video_fps <= 0:
            video_fps = fps or DEFAULT_SCAN_FPS

        scan_fps = max(float(fps or DEFAULT_SCAN_FPS), 0.25)
        interval = max(int(video_fps / scan_fps), 1)
        background_subtractor = _build_background_subtractor()

        count = 0
        last_kept_timestamp = -STATIC_KEEP_INTERVAL_SECONDS
        previous_gray = None

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Keep temporal detectors warm with every sequential frame.
            foreground_mask = _foreground_mask(background_subtractor, frame)
            gray, previous_gray, global_diff = _frame_gray_and_diff(
                previous_gray,
                frame,
            )

            if count % interval == 0:
                timestamp_seconds = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
                if timestamp_seconds <= 0:
                    timestamp_seconds = (
                        count / video_fps if video_fps > 0 else len(frames) / scan_fps
                    )
                motion_pixels = int(np.count_nonzero(foreground_mask))
                total_pixels = max(frame.shape[0] * frame.shape[1], 1)
                motion_ratio = motion_pixels / float(total_pixels)
                has_motion = motion_ratio >= MOTION_PIXEL_RATIO_THRESHOLD

                has_camera_motion = global_diff >= CAMERA_MOTION_DIFF_THRESHOLD
                keep_interval = (
                    DYNAMIC_KEEP_INTERVAL_SECONDS
                    if has_camera_motion
                    else STATIC_KEEP_INTERVAL_SECONDS
                )
                should_keep_for_heartbeat = (
                    timestamp_seconds - last_kept_timestamp >= keep_interval
                )

                blur_score, brightness, contrast_std = _frame_quality_metrics(gray)
                passes_brightness = MIN_BRIGHTNESS <= brightness <= MAX_BRIGHTNESS
                passes_blur = blur_score >= MIN_BLUR_SCORE
                passes_contrast = contrast_std >= MIN_CONTRAST_STD
                quality_score = _normalized_quality_score(
                    motion_ratio,
                    blur_score,
                    contrast_std,
                )

                should_save = False

                if should_keep_for_heartbeat:
                    should_save = True
                elif has_motion:
                    if (
                        passes_brightness
                        and passes_blur
                        and passes_contrast
                        and quality_score >= MIN_QUALITY_SCORE
                    ):
                        should_save = True

                if should_save:
                    frames.append(
                        {
                            "frame": frame,
                            "frame_index": count,
                            "timestamp_seconds": timestamp_seconds,
                            "quality": {
                                "motion_pixels": motion_pixels,
                                "motion_ratio": round(motion_ratio, 5),
                                "has_motion": has_motion,
                                "global_diff": round(global_diff, 3),
                                "has_camera_motion": has_camera_motion,
                                "keep_interval_seconds": keep_interval,
                                "blur_score": round(blur_score, 3),
                                "brightness": round(brightness, 3),
                                "contrast_std": round(contrast_std, 3),
                                "quality_score": round(quality_score, 4),
                                "heartbeat_saved": should_keep_for_heartbeat,
                            },
                        }
                    )
                    last_kept_timestamp = timestamp_seconds

            count += 1

        if not frames:
            raise ValueError("No frames were extracted from the video.")

        return frames
    finally:
        cap.release()
