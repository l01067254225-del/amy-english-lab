import {
  incorrectAnswerCloseBtnStyle,
  incorrectAnswerRetryBtnStyle,
  incorrectAnswerSubmitBtnStyle,
} from "./incorrectAnswerModalStyles";

export function IncorrectAnswerSubmitButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...incorrectAnswerSubmitBtnStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      제출
    </button>
  );
}

export function IncorrectAnswerRetryButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...incorrectAnswerRetryBtnStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      다시 풀기
    </button>
  );
}

export function IncorrectAnswerCloseButton({ onClick, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...incorrectAnswerCloseBtnStyle,
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      닫기
    </button>
  );
}
