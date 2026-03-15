declare namespace google {
    export const accounts: {
        id: {
            initialize: (config: any) => void;
            renderButton: (parent: HTMLElement, options: any) => void;
            prompt: (momentListener?: (response: any) => void) => void;
            disableAutoSelect: () => void;
        };
    };
}

interface Window {
    google: typeof google;
}
