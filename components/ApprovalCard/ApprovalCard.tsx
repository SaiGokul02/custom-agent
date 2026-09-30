import { useState } from "react";
import type { ActionRequest, ReviewConfig } from "langchain";
import styles from "./ApprovalCard.module.css";

interface ApprovalCardProps {
  actionRequest: ActionRequest;
  reviewConfig?: ReviewConfig;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onEdit: (actionRequest: ActionRequest) => void;
  isProcessing: boolean;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.285Z"
      />
    </svg>
  );
}

export function ApprovalCard({
  actionRequest,
  reviewConfig,
  onApprove,
  onReject,
  onEdit,
  isProcessing,
}: ApprovalCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedArgs, setEditedArgs] = useState<ActionRequest["args"]>(
    actionRequest.args,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const allowed = reviewConfig?.allowedDecisions ?? [
    "approve",
    "reject",
    "edit",
  ];

  const canEdit = allowed.includes("edit");
  const canReject = allowed.includes("reject");

  /**
   * Convert an argument value into a string for editing.
   *
   * Strings stay as strings.
   * Objects/arrays are converted to formatted JSON.
   */
  const formatEditableValue = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value, null, 2);
  };

  /**
   * Convert the edited string back to the original value type.
   *
   * Strings remain strings.
   * Objects/arrays/numbers/booleans are parsed as JSON.
   */
  const parseEditedValue = (value: string, originalValue: unknown): unknown => {
    if (typeof originalValue === "string") {
      return value;
    }

    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid JSON for value: ${value}`);
    }
  };

  /**
   * Start editing.
   *
   * Convert all arguments into strings so the inputs/textarea
   * can safely edit them.
   */
  const startEditing = () => {
    const editableArgs = Object.fromEntries(
      Object.entries(actionRequest.args).map(([key, value]) => [
        key,
        formatEditableValue(value),
      ]),
    );

    setEditedArgs(editableArgs);
    setIsEditing(true);
  };

  /**
   * Cancel editing and restore the original arguments.
   */
  const cancelEditing = () => {
    setEditedArgs(actionRequest.args);
    setIsEditing(false);
  };

  /**
   * Save the edited action.
   *
   * Convert string values back into their original types before
   * sending them to the parent.
   */
  const saveEditedAction = () => {
    try {
      const parsedArgs = Object.fromEntries(
        Object.entries(editedArgs).map(([key, value]) => {
          const originalValue = actionRequest.args[key];

          const parsedValue = parseEditedValue(String(value), originalValue);

          return [key, parsedValue];
        }),
      );

      const editedAction: ActionRequest = {
        name: actionRequest.name,
        args: parsedArgs,
      };

      console.log("Saving edited action:", editedAction);

      onEdit(editedAction);

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to parse edited action:", error);

      alert(
        "The edited value contains invalid JSON. Please check the fields and try again.",
      );
    }
  };

  if (isEditing) {
    return (
      <div className={styles.card} data-testid="sdk-preview-chat-turn">
        <div className={styles.header}>
          <PencilIcon className={`${styles.icon} ${styles.iconPrimary}`} />

          <span className={styles.headerTitle}>
            Edit — <code className={styles.editCode}>{actionRequest.name}</code>
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.editFields}>
            {Object.entries(actionRequest.args).map(([key, originalValue]) => {
              const value =
                editedArgs[key] !== undefined
                  ? editedArgs[key]
                  : formatEditableValue(originalValue);

              const strValue = String(value);

              const isLong = strValue.length > 80 || strValue.includes("\n");

              return (
                <div key={key} className={styles.field}>
                  <label htmlFor={`edit-${key}`} className={styles.label}>
                    {key}
                  </label>

                  {isLong ? (
                    <textarea
                      id={`edit-${key}`}
                      value={strValue}
                      onChange={(e) => {
                        setEditedArgs((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }));
                      }}
                      rows={8}
                      className={styles.textarea}
                    />
                  ) : (
                    <input
                      id={`edit-${key}`}
                      type="text"
                      value={strValue}
                      onChange={(e) => {
                        setEditedArgs((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }));
                      }}
                      className={styles.input}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={`${styles.actions} ${styles.actionsEdit}`}>
            <button
              type="button"
              onClick={saveEditedAction}
              disabled={isProcessing}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              <CheckIcon className={styles.iconSm} />
              Save & Approve
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={isProcessing}
              className={`${styles.btn} ${styles.btnSecondary}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log("Current action args:", actionRequest.args);

  return (
    <div className={styles.card} data-testid="sdk-preview-chat-turn">
      <div className={styles.header}>
        <ShieldIcon className={`${styles.icon} ${styles.iconWarning}`} />

        <span className={styles.headerTitle}>Review Required</span>

        <span className={styles.badge}>Awaiting Approval</span>
      </div>

      <div className={styles.body}>
        <div className={styles.action}>
          {actionRequest.description && (
            <p className={styles.actionDescription}>
              {actionRequest.description}
            </p>
          )}

          <div className={styles.args}>
            {Object.entries(actionRequest.args).map(([key, value]) => {
              const strValue = formatValue(value);
              const isMultiline = strValue.includes("\n");

              return (
                <div key={key}>
                  <div className={styles.argKey}>{key}</div>

                  {isMultiline ? (
                    <pre className={styles.argValueMultiline}>{strValue}</pre>
                  ) : (
                    <div className={styles.argValue}>{strValue}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showRejectInput && (
          <div className={styles.rejectField}>
            <label htmlFor="reject-reason" className={styles.label}>
              Reason for rejection{" "}
              <span className={styles.labelHint}>(optional)</span>
            </label>

            <input
              id="reject-reason"
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason..."
              autoFocus
              className={`${styles.input} ${styles.inputDanger}`}
            />
          </div>
        )}

        <div className={styles.actions}>
          {showRejectInput ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onReject(rejectReason || "User rejected");

                  setShowRejectInput(false);
                }}
                disabled={isProcessing}
                className={`${styles.btn} ${styles.btnDanger}`}
              >
                <XIcon className={styles.iconSm} />
                Confirm Rejection
              </button>

              <button
                type="button"
                onClick={() => setShowRejectInput(false)}
                className={`${styles.btn} ${styles.btnSecondary}`}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onApprove}
                disabled={isProcessing}
                className={`${styles.btn} ${styles.btnApprove}`}
              >
                <CheckIcon className={styles.iconSm} />
                Approve
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={startEditing}
                  disabled={isProcessing}
                  className={`${styles.btn} ${styles.btnSecondary}`}
                >
                  <PencilIcon className={styles.iconSm} />
                  Edit
                </button>
              )}

              {canReject && (
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className={`${styles.btn} ${styles.btnReject}`}
                >
                  <XIcon className={styles.iconSm} />
                  Reject
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// export function ApprovalCard({
//   actionRequest,
//   reviewConfig,
//   onApprove,
//   onReject,
//   onEdit,
//   isProcessing,
// }: ApprovalCardProps) {
//   const [isEditing, setIsEditing] = useState(false);
//   const [editedArgs, setEditedArgs] = useState<ActionRequest["args"]>(
//     actionRequest.args,
//   );
//   const [rejectReason, setRejectReason] = useState("");
//   const [showRejectInput, setShowRejectInput] = useState(false);

//   const allowed = reviewConfig?.allowedDecisions ?? [
//     "approve",
//     "reject",
//     "edit",
//   ];
//   const canEdit = allowed.includes("edit");
//   const canReject = allowed.includes("reject");

//   const parseValue = (value: string, originalValue: unknown) => {
//     // Strings should remain strings
//     if (typeof originalValue === "string") {
//       return value;
//     }

//     // Arrays, objects, numbers and booleans are stored as JSON
//     try {
//       return JSON.parse(value);
//     } catch {
//       // While the user is typing, the JSON may temporarily be invalid.
//       return value;
//     }
//   };

//   if (isEditing) {
//     return (
//       <div className={styles.card} data-testid="sdk-preview-chat-turn">
//         <div className={styles.header}>
//           <PencilIcon className={`${styles.icon} ${styles.iconPrimary}`} />
//           <span className={styles.headerTitle}>
//             Edit — <code className={styles.editCode}>{actionRequest.name}</code>
//           </span>
//         </div>

//         <div className={styles.body}>
//           <div className={styles.editFields}>
//             {Object.entries(editedArgs).map(([key, value]) => {
//               const strValue = formatValue(value);
//               const isLong = strValue.length > 80 || strValue.includes("\n");

//               return (
//                 <div key={key} className={styles.field}>
//                   <label htmlFor={`edit-${key}`} className={styles.label}>
//                     {key}
//                   </label>

//                   {isLong ? (
//                     <textarea
//                       id={`edit-${key}`}
//                       value={strValue}
//                       onChange={(e) => {
//                         const newValue = parseValue(e.target.value, value);

//                         setEditedArgs((prev) => ({
//                           ...prev,
//                           [key]: newValue,
//                         }));
//                       }}
//                       rows={6}
//                       className={styles.textarea}
//                     />
//                   ) : (
//                     <input
//                       id={`edit-${key}`}
//                       type="text"
//                       value={strValue}
//                       onChange={(e) => {
//                         setEditedArgs((prev) => ({
//                           ...prev,
//                           [key]: e.target.value,
//                         }));
//                       }}
//                       className={styles.input}
//                     />
//                   )}
//                 </div>
//               );
//             })}
//           </div>

//           <div className={`${styles.actions} ${styles.actionsEdit}`}>
//             <button
//               type="button"
//               onClick={() => {
//                 onEdit({
//                   name: actionRequest.name,
//                   args: editedArgs,
//                 });

//                 setIsEditing(false);
//               }}
//               disabled={isProcessing}
//               className={`${styles.btn} ${styles.btnPrimary}`}
//             >
//               <CheckIcon className={styles.iconSm} />
//               Save & Approve
//             </button>

//             <button
//               type="button"
//               onClick={() => {
//                 setEditedArgs(actionRequest.args);
//                 setIsEditing(false);
//               }}
//               disabled={isProcessing}
//               className={`${styles.btn} ${styles.btnSecondary}`}
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   console.log("edited args ", editedArgs);

//   return (
//     <div className={styles.card} data-testid="sdk-preview-chat-turn">
//       <div className={styles.header}>
//         <ShieldIcon className={`${styles.icon} ${styles.iconWarning}`} />
//         <span className={styles.headerTitle}>Review Required</span>
//         <span className={styles.badge}>Awaiting Approval</span>
//       </div>

//       <div className={styles.body}>
//         <div className={styles.action}>
//           {/* <code className={styles.actionName}>{actionRequest.name}</code> */}
//           {actionRequest.description && (
//             <p className={styles.actionDescription}>
//               {actionRequest.description}
//             </p>
//           )}

//           <div className={styles.args}>
//             {Object.entries(actionRequest.args).map(([key, value]) => {
//               const strValue = formatValue(value);
//               const isMultiline = strValue.includes("\n");
//               return (
//                 <div key={key}>
//                   <div className={styles.argKey}>{key}</div>
//                   {isMultiline ? (
//                     <pre className={styles.argValueMultiline}>{strValue}</pre>
//                   ) : (
//                     <div className={styles.argValue}>{strValue}</div>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {showRejectInput && (
//           <div className={styles.rejectField}>
//             <label htmlFor="reject-reason" className={styles.label}>
//               Reason for rejection{" "}
//               <span className={styles.labelHint}>(optional)</span>
//             </label>
//             <input
//               id="reject-reason"
//               type="text"
//               value={rejectReason}
//               onChange={(e) => setRejectReason(e.target.value)}
//               placeholder="Enter reason..."
//               autoFocus
//               className={`${styles.input} ${styles.inputDanger}`}
//             />
//           </div>
//         )}

//         <div className={styles.actions}>
//           {showRejectInput ? (
//             <>
//               <button
//                 type="button"
//                 onClick={() => {
//                   onReject(rejectReason || "User rejected");
//                   setShowRejectInput(false);
//                 }}
//                 disabled={isProcessing}
//                 className={`${styles.btn} ${styles.btnDanger}`}
//               >
//                 <XIcon className={styles.iconSm} />
//                 Confirm Rejection
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setShowRejectInput(false)}
//                 className={`${styles.btn} ${styles.btnSecondary}`}
//               >
//                 Cancel
//               </button>
//             </>
//           ) : (
//             <>
//               <button
//                 type="button"
//                 onClick={onApprove}
//                 disabled={isProcessing}
//                 className={`${styles.btn} ${styles.btnApprove}`}
//               >
//                 <CheckIcon className={styles.iconSm} />
//                 Approve
//               </button>
//               {canEdit && (
//                 <button
//                   type="button"
//                   onClick={() => setIsEditing(true)}
//                   disabled={isProcessing}
//                   className={`${styles.btn} ${styles.btnSecondary}`}
//                 >
//                   <PencilIcon className={styles.iconSm} />
//                   Edit
//                 </button>
//               )}
//               {canReject && (
//                 <button
//                   type="button"
//                   onClick={() => setShowRejectInput(true)}
//                   disabled={isProcessing}
//                   className={`${styles.btn} ${styles.btnReject}`}
//                 >
//                   <XIcon className={styles.iconSm} />
//                   Reject
//                 </button>
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
