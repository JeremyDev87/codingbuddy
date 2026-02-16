/**
 * 텍스트를 클립보드에 복사한다.
 * @returns 복사 성공 여부
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
