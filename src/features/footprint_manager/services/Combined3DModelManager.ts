import type {
  Footprint3DModelMetadata,
  Footprint3DModelPackage,
  Local3DModelManager as Local3DModelManagerContract,
} from "../types";
import { Cloud3DModelManager } from "./Cloud3DModelManager";

// Composite manager: prefer local manager for install/list/uninstall and
// attempt cloud lookups when local doesn't provide model data.
export class Combined3DModelManager implements Local3DModelManagerContract {
  private local: Local3DModelManagerContract;
  private cloud: Cloud3DModelManager | null;

  constructor(local: Local3DModelManagerContract, cloud?: Cloud3DModelManager | null) {
    this.local = local;
    this.cloud = cloud ?? null;
  }

  listInstalled(): Promise<Footprint3DModelMetadata[]> {
    return this.local.listInstalled();
  }

  installFromZip(buffer: ArrayBuffer, category?: string | undefined): Promise<Footprint3DModelMetadata[]> {
    // Delegate installs to local manager only
    // Local3DModelManager.installFromZip signature allows optional category
    // and returns an array for this implementation.
    return (this.local as any).installFromZip(buffer, category);
  }

  uninstall(id: string): Promise<void> {
    return this.local.uninstall(id);
  }

  async getModel(id: string): Promise<Footprint3DModelPackage | null> {
    try {
      const localPkg = await this.local.getModel(id);
      const hasLocalData = localPkg && localPkg.data instanceof ArrayBuffer;
      if (hasLocalData) return localPkg;

      if (!this.cloud) return localPkg ?? null;

      try {
        const cloudPkg = await this.cloud.getModel(id);
        if (cloudPkg) {
          if (cloudPkg.data instanceof ArrayBuffer) {
            console.info("Footprint 3D model resolved through cloud (id):", id);
            return cloudPkg;
          }
          // cloud returned metadata but no binary data
          console.info("Cloud 3D model metadata found but no binary data (id):", id);
        }
        // Return local package (even if meta-only) if cloud didn't provide data
        return localPkg ?? cloudPkg ?? null;
      } catch (e) {
        return localPkg ?? null;
      }
    } catch (e) {
      console.warn("Combined3DModelManager.getModel failed", e);
      if (!this.cloud) return null;
      try {
        return await this.cloud.getModel(id);
      } catch {
        return null;
      }
    }
  }

  async findByFootprintName(footprintName: string): Promise<Footprint3DModelPackage | null> {
    try {
      const localPkg = await (this.local as any).findByFootprintName(footprintName);
      const hasLocalData = localPkg && localPkg.data instanceof ArrayBuffer;
      if (hasLocalData) return localPkg;

      if (!this.cloud) return localPkg ?? null;

      try {
        const cloudPkg = await this.cloud.findByFootprintName(footprintName);
        if (cloudPkg) {
          if (cloudPkg.data instanceof ArrayBuffer) {
            console.info("Footprint 3D model resolved through cloud (name):", footprintName);
            return cloudPkg;
          }
          console.info("Cloud 3D model metadata found but no binary data (name):", footprintName);
        }
        return localPkg ?? cloudPkg ?? null;
      } catch (e) {
        return localPkg ?? null;
      }
    } catch (e) {
      console.warn("Combined3DModelManager.findByFootprintName failed", e);
      if (!this.cloud) return null;
      try {
        return await this.cloud.findByFootprintName(footprintName);
      } catch {
        return null;
      }
    }
  }
}
