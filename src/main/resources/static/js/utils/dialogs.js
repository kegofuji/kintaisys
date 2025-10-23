(function () {
    const dialogState = {
        modalElement: null,
        titleElement: null,
        messageElement: null,
        confirmButton: null,
        cancelButton: null,
        reasonGroup: null,
        reasonLabelText: null,
        reasonInput: null,
        reasonFeedback: null,
        modalInstance: null
    };

    function ensureElements() {
        if (dialogState.modalElement) {
            return true;
        }

        dialogState.modalElement = document.getElementById('employeeActionConfirmModal');
        if (!dialogState.modalElement) {
            console.warn('employeeActionConfirmModal が見つかりません。ブラウザ標準の確認ダイアログを使用します。');
            return false;
        }

        dialogState.titleElement = document.getElementById('employeeActionConfirmTitle');
        dialogState.messageElement = document.getElementById('employeeActionConfirmMessage');
        dialogState.confirmButton = document.getElementById('employeeActionConfirmButton');
        dialogState.cancelButton = document.getElementById('employeeActionCancelButton');
        dialogState.reasonGroup = document.getElementById('employeeActionReasonGroup');
        dialogState.reasonLabelText = document.getElementById('employeeActionReasonLabelText');
        dialogState.reasonInput = document.getElementById('employeeActionReason');
        dialogState.reasonFeedback = document.getElementById('employeeActionReasonFeedback');
        dialogState.modalInstance = typeof bootstrap !== 'undefined'
            ? bootstrap.Modal.getOrCreateInstance(dialogState.modalElement)
            : null;

        return !!dialogState.modalInstance;
    }

    async function showConfirm({
        title = '確認',
        message = '',
        confirmLabel = '実行する',
        cancelLabel = 'キャンセル',
        requireReason = false,
        reasonLabel = '理由',
        reasonPlaceholder = '理由を入力してください',
        invalidFeedback = '理由は必須です。'
    } = {}) {
        const hasModal = typeof bootstrap !== 'undefined' && ensureElements();

        if (!hasModal) {
            if (requireReason) {
                const reason = prompt(`${message}\n\n${reasonLabel}を入力してください。`);
                if (reason === null) {
                    return { confirmed: false };
                }
                const trimmed = reason.trim();
                if (!trimmed) {
                    alert(invalidFeedback || '理由は必須です。');
                    return { confirmed: false };
                }
                return { confirmed: true, reason: trimmed };
            }
            const confirmed = window.confirm(message || '実行しますか？');
            return { confirmed };
        }

        const {
            modalElement,
            modalInstance,
            titleElement,
            messageElement,
            confirmButton,
            cancelButton,
            reasonGroup,
            reasonLabelText,
            reasonInput,
            reasonFeedback
        } = dialogState;

        if (titleElement) titleElement.textContent = title || '確認';
        if (messageElement) {
            // HTMLタグが含まれている場合はinnerHTMLを使用、それ以外はtextContent
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = message;
            const hasHtml = tempDiv.querySelector('*') !== null;
            
            if (hasHtml) {
                messageElement.innerHTML = message || '';
            } else {
                messageElement.textContent = message || '';
            }
            // 余白最小化（既存モーダルの見た目を踏襲）
            messageElement.style.minHeight = '0';
            messageElement.classList.remove('mb-3');
            if (!messageElement.classList.contains('mb-2')) {
                messageElement.classList.add('mb-2');
            }
        }
        if (confirmButton) confirmButton.textContent = confirmLabel || '実行する';
        if (cancelButton) cancelButton.textContent = cancelLabel || 'キャンセル';

        if (reasonGroup) {
            reasonGroup.style.display = requireReason ? 'block' : 'none';
        }
        if (reasonLabelText) {
            reasonLabelText.textContent = reasonLabel || '理由';
        }
        if (reasonFeedback) {
            reasonFeedback.textContent = invalidFeedback || '理由は必須です。';
        }
        if (reasonInput) {
            reasonInput.value = '';
            reasonInput.placeholder = reasonPlaceholder || '';
            reasonInput.classList.remove('is-invalid');
        }

        return await new Promise((resolve) => {
            let resolved = false;

            const finalize = (result) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(result);
            };

            const onConfirm = () => {
                if (requireReason) {
                    const reason = reasonInput?.value?.trim() || '';
                    if (!reason) {
                        if (reasonInput) {
                            reasonInput.classList.add('is-invalid');
                            reasonInput.focus();
                        }
                        return;
                    }
                    modalInstance.hide();
                    finalize({ confirmed: true, reason });
                    return;
                }
                modalInstance.hide();
                finalize({ confirmed: true });
            };

            const onCancel = () => {
                modalInstance.hide();
                finalize({ confirmed: false });
            };

            const onHidden = () => {
                finalize({ confirmed: false });
            };

            const onInput = () => {
                reasonInput?.classList.remove('is-invalid');
            };

            const onShown = () => {
                if (requireReason && reasonInput) {
                    reasonInput.focus();
                }
            };

            const cleanup = () => {
                confirmButton?.removeEventListener('click', onConfirm);
                cancelButton?.removeEventListener('click', onCancel);
                modalElement.removeEventListener('hidden.bs.modal', onHidden);
                modalElement.removeEventListener('shown.bs.modal', onShown);
                reasonInput?.removeEventListener('input', onInput);
            };

            confirmButton?.addEventListener('click', onConfirm);
            cancelButton?.addEventListener('click', onCancel);
            modalElement.addEventListener('hidden.bs.modal', onHidden);
            modalElement.addEventListener('shown.bs.modal', onShown);
            reasonInput?.addEventListener('input', onInput);

            modalInstance.show();
        });
    }

    window.employeeDialog = {
        confirm: showConfirm
    };
})();
