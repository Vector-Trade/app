import { IStellarWalletsSignAuthEntry, IStellarWalletsSignBlob, IStellarWalletsSignTx, ISupportedWallet, KitActions, ModuleInterface, WalletNetwork } from './types';
export interface StellarWalletsKitParams {
    selectedWalletId: string;
    network: WalletNetwork;
    modules: ModuleInterface[];
}
export declare class StellarWalletsKit implements KitActions {
    private selectedWallet;
    private selectedModule;
    private network;
    private modalElement?;
    private readonly modules;
    constructor(params: StellarWalletsKitParams);
    /**
     * This method will return an array with all wallets supported by this kit but will let you know those the user have already installed/has access to
     * There are wallets that are by default available since they either don't need to be installed or have a fallback
     */
    getSupportedWallets(): Promise<ISupportedWallet[]>;
    setNetwork(network: WalletNetwork): void;
    setWallet(id: string): void;
    getPublicKey(params?: {
        path?: string;
    }): Promise<string>;
    signTx(params: {
        xdr: string;
        publicKeys: string[];
        network: WalletNetwork;
    }): Promise<{
        result: string;
    }>;
    signBlob(params: {
        blob: string;
        publicKey?: string;
    }): Promise<{
        result: string;
    }>;
    signAuthEntry(params: {
        entryPreimageXDR: string;
        publicKey?: string;
    }): Promise<{
        result: string;
    }>;
    /**
     * @deprecated - This method will be removed in future releases.
     * Use specific methods instead like signTx, signBlob, etc
     */
    sign(params: IStellarWalletsSignBlob | IStellarWalletsSignTx | IStellarWalletsSignAuthEntry): Promise<{
        signedXDR: string;
    }>;
    openModal(params: {
        onWalletSelected: (option: ISupportedWallet) => void;
        onClosed?: (err: Error) => void;
        modalDialogStyles?: {
            [name: string]: string | number | undefined | null;
        };
        modalTitle?: string;
        notAvailableText?: string;
    }): Promise<void>;
}
//# sourceMappingURL=stellar-wallets-kit.d.ts.map