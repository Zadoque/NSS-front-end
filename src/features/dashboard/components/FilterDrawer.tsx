import { useEffect, useRef } from "react";
import { FilterPanel, type FilterPanelProps } from "./FilterPanel";
export function FilterDrawer({ panel }: { panel: FilterPanelProps }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches && dialog.current?.open) dialog.current.close();
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return (
    <div className="mobile-controls">
      <button
        ref={trigger}
        className="primary"
        onClick={() => dialog.current?.showModal()}
      >
        Filtros e informações <span aria-hidden="true">↗</span>
      </button>
      <dialog
        ref={dialog}
        aria-label="Filtros e informações"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="drawer-body">
          <button className="drawer-close" onClick={close} autoFocus>
            Fechar ×
          </button>
          <FilterPanel {...panel} />
        </div>
      </dialog>
    </div>
  );
}
