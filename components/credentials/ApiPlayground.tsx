'use client';

import { useState, useEffect } from 'react';
import { Play, Copy, Trash2, Save, FileJson, Info, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/stores/app.store';
import { useFloatMessage } from '@/components/feedback/FloatMessageProvider';
import { FirebaseService } from '@/services/firebase.service';
import { DPDNSService } from '@/services/dpdns.service';
import { CloudflareService } from '@/services/cloudflare.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { DiagnosticAsset } from '@/types';

type ServiceType = 'dpdns' | 'cloudflare';

export function ApiPlayground() {
  const user = useAppStore((state) => state.user);
  const accounts = useAppStore((state) => state.accounts);
  const { notifySuccess, notifyError } = useFloatMessage();

  // Selected config
  const [selectedService, setSelectedService] = useState<ServiceType>('dpdns');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedApi, setSelectedApi] = useState('');

  // Form parameters
  const [paramDomain, setParamDomain] = useState('');
  const [paramSlotType, setParamSlotType] = useState('free');
  const [paramNameservers, setParamNameservers] = useState('');
  const [paramZoneId, setParamZoneId] = useState('');
  const [paramRecordId, setParamRecordId] = useState('');
  
  // DNS record params
  const [paramRecordType, setParamRecordType] = useState('A');
  const [paramRecordName, setParamRecordName] = useState('');
  const [paramRecordContent, setParamRecordContent] = useState('');
  const [paramRecordTtl, setParamRecordTtl] = useState('3600');
  const [paramRecordProxied, setParamRecordProxied] = useState(false);

  // Tunnel params
  const [paramTunnelName, setParamTunnelName] = useState('');

  // API Call Status
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Diagnostic Assets list
  const [savedAssets, setSavedAssets] = useState<DiagnosticAsset[]>([]);

  // Realtime subscription for diagnostic assets
  useEffect(() => {
    if (!user) return;
    return FirebaseService.subscribeDiagnosticAssets(user.uid, setSavedAssets);
  }, [user]);

  // Handle Account change - auto select first API when service changes
  useEffect(() => {
    if (selectedService === 'dpdns') {
      setSelectedApi('listDomains');
    } else {
      setSelectedApi('getZones');
    }
    setApiResponse(null);
    setApiError(null);
  }, [selectedService]);

  const activeAccount = accounts.find((acc) => acc.id === selectedAccountId);

  // Expose suitable APIs
  const dpdnsApis = [
    { value: 'listDomains', label: 'List Domains (GET /domains)' },
    { value: 'getAccountInfo', label: 'Get Account Info (GET /profile)' },
    { value: 'registerDomain', label: 'Register Domain (POST /domains)' },
  ];

  const cloudflareApis = [
    { value: 'getZones', label: 'List Zones (GET /zones)' },
    { value: 'createZone', label: 'Create Zone (POST /zones)' },
    { value: 'getDnsRecords', label: 'List DNS Records (GET /zones/:id/dns_records)' },
    { value: 'createDnsRecord', label: 'Create DNS Record (POST /zones/:id/dns_records)' },
    { value: 'deleteDnsRecord', label: 'Delete DNS Record (DELETE /zones/:id/dns_records/:rec_id)' },
    { value: 'getTunnels', label: 'List Cloudflare Tunnels (GET /accounts/:id/tunnels)' },
    { value: 'createTunnel', label: 'Create Cloudflare Tunnel (POST /accounts/:id/tunnels)' },
  ];

  const executeApi = async () => {
    if (!activeAccount) {
      setApiError('Please select a credential account first.');
      return;
    }

    setIsLoading(true);
    setApiResponse(null);
    setApiError(null);

    try {
      let result: any = null;

      if (selectedService === 'dpdns') {
        const token = activeAccount.dpdnsToken;
        if (!token) throw new Error('Selected account is missing a DPDNS Token.');

        switch (selectedApi) {
          case 'listDomains':
            result = await DPDNSService.listDomains(token);
            break;
          case 'getAccountInfo':
            result = await DPDNSService.getAccountInfo(token);
            break;
          case 'registerDomain':
            if (!paramDomain) throw new Error('Domain name is required.');
            const nsList = paramNameservers
              .split(/[\n,]+/)
              .map((ns) => ns.trim())
              .filter((ns) => ns.length > 0);
            if (nsList.length === 0) throw new Error('At least one nameserver is required.');
            result = await DPDNSService.registerDomain(token, paramDomain, paramSlotType as any, nsList);
            break;
          default:
            throw new Error('Unknown DPDNS API endpoint.');
        }
      } else {
        const { cloudflareEmail, cloudflareApiKey, cloudflareAccountId } = activeAccount;
        if (!cloudflareEmail || !cloudflareApiKey) {
          throw new Error('Selected account is missing Cloudflare API credentials.');
        }

        switch (selectedApi) {
          case 'getZones':
            result = await CloudflareService.getZones(cloudflareEmail, cloudflareApiKey);
            break;
          case 'createZone':
            if (!paramDomain) throw new Error('Domain name (Zone name) is required.');
            if (!cloudflareAccountId) throw new Error('Cloudflare Account ID is required to create a zone.');
            result = await CloudflareService.createZone(cloudflareEmail, cloudflareApiKey, cloudflareAccountId, paramDomain);
            break;
          case 'getDnsRecords':
            if (!paramZoneId) throw new Error('Cloudflare Zone ID is required.');
            result = await CloudflareService.getDnsRecords(cloudflareEmail, cloudflareApiKey, paramZoneId);
            break;
          case 'createDnsRecord':
            if (!paramZoneId) throw new Error('Cloudflare Zone ID is required.');
            if (!paramRecordName) throw new Error('Record name is required.');
            if (!paramRecordContent) throw new Error('Record content (IP/CNAME Target) is required.');
            result = await CloudflareService.createDnsRecord(cloudflareEmail, cloudflareApiKey, paramZoneId, {
              type: paramRecordType,
              name: paramRecordName,
              content: paramRecordContent,
              ttl: parseInt(paramRecordTtl, 10) || 3600,
              proxied: paramRecordProxied,
            });
            break;
          case 'deleteDnsRecord':
            if (!paramZoneId) throw new Error('Cloudflare Zone ID is required.');
            if (!paramRecordId) throw new Error('Cloudflare DNS Record ID is required.');
            result = await CloudflareService.deleteDnsRecord(cloudflareEmail, cloudflareApiKey, paramZoneId, paramRecordId);
            break;
          case 'getTunnels':
            if (!cloudflareAccountId) throw new Error('Cloudflare Account ID is required to fetch Tunnels.');
            result = await CloudflareService.getTunnels(cloudflareEmail, cloudflareApiKey, cloudflareAccountId);
            break;
          case 'createTunnel':
            if (!cloudflareAccountId) throw new Error('Cloudflare Account ID is required to create a Tunnel.');
            if (!paramTunnelName) throw new Error('Tunnel name is required.');
            result = await CloudflareService.createTunnel(cloudflareEmail, cloudflareApiKey, cloudflareAccountId, paramTunnelName);
            break;
          default:
            throw new Error('Unknown Cloudflare API endpoint.');
        }
      }

      setApiResponse(result);
      notifySuccess('API Playground', 'API execution completed successfully.');
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'API request failed.');
      notifyError('API Playground', err.message || 'API request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notifySuccess('Clipboard', 'Copied response to clipboard.');
  };

  // Diagnostic Asset saving helper
  const handleSaveAsset = async () => {
    if (!user || !activeAccount || !apiResponse) return;

    let assetName = '';
    let assetType: 'tunnel' | 'dns_record' | 'other' = 'other';
    let dataToSave = apiResponse;

    if (selectedApi === 'getTunnels' || selectedApi === 'createTunnel') {
      assetType = 'tunnel';
      assetName = selectedApi === 'createTunnel' 
        ? `Tunnel: ${apiResponse.name || 'New Tunnel'}`
        : `Tunnels List (${Array.isArray(apiResponse) ? apiResponse.length : 0} items)`;
    } else if (selectedApi === 'getDnsRecords' || selectedApi === 'createDnsRecord') {
      assetType = 'dns_record';
      assetName = selectedApi === 'createDnsRecord'
        ? `DNS Record: ${apiResponse.name || 'New Record'}`
        : `DNS Records for Zone: ${paramZoneId.substring(0, 8)}...`;
    } else {
      assetName = `${selectedService.toUpperCase()}: ${selectedApi}`;
    }

    try {
      await FirebaseService.saveDiagnosticAsset(user.uid, assetType, {
        id: `ast_${Math.random().toString(36).substring(2, 11)}`,
        name: assetName,
        asset_type: assetType,
        associated_account_id: activeAccount.id,
        associated_account_name: activeAccount.name,
        data: dataToSave,
      });
      notifySuccess('Diagnostic Asset Saved', `Saved "${assetName}" to Firebase Database.`);
    } catch (error: any) {
      notifyError('Save Failed', error.message || 'Could not save asset.');
    }
  };

  const handleDeleteAsset = async (asset: DiagnosticAsset) => {
    if (!user) return;
    try {
      await FirebaseService.deleteDiagnosticAsset(user.uid, asset.asset_type, asset.id);
      notifySuccess('Asset Deleted', 'Diagnostic asset deleted successfully.');
    } catch (error: any) {
      notifyError('Delete Failed', error.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Playground Controller Card */}
      <section className="feature-card">
        <h2 className="mb-4 text-xl font-semibold text-ink flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary" /> API Controller Console
        </h2>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 flex gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">No Accounts Available</p>
              <p className="mt-1">Please add a DPDNS or Cloudflare account in the Credentials Manager tab first to enable the playground.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Service Select */}
              <div>
                <label className="block text-sm font-semibold text-ink">Target Service</label>
                <div className="mt-2 flex rounded-lg border border-hairline bg-surface-soft p-0.5">
                  <button
                    type="button"
                    className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition-all ${
                      selectedService === 'dpdns' ? 'bg-white text-ink shadow-sm' : 'text-body hover:text-ink'
                    }`}
                    onClick={() => setSelectedService('dpdns')}
                  >
                    DPDNS
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition-all ${
                      selectedService === 'cloudflare' ? 'bg-white text-ink shadow-sm' : 'text-body hover:text-ink'
                    }`}
                    onClick={() => setSelectedService('cloudflare')}
                  >
                    Cloudflare
                  </button>
                </div>
              </div>

              {/* Account Select */}
              <div>
                <label className="block text-sm font-semibold text-ink">Active Account Credential</label>
                <Select
                  className="mt-2"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">-- Choose Account --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.cloudflareEmail || 'No CF Email'})
                    </option>
                  ))}
                </Select>
              </div>

              {/* API Action Select */}
              <div>
                <label className="block text-sm font-semibold text-ink">API Endpoint/Method</label>
                <Select
                  className="mt-2"
                  value={selectedApi}
                  onChange={(e) => {
                    setSelectedApi(e.target.value);
                    setApiResponse(null);
                    setApiError(null);
                  }}
                >
                  {selectedService === 'dpdns'
                    ? dpdnsApis.map((api) => (
                        <option key={api.value} value={api.value}>
                          {api.label}
                        </option>
                      ))
                    : cloudflareApis.map((api) => (
                        <option key={api.value} value={api.value}>
                          {api.label}
                        </option>
                      ))}
                </Select>
              </div>
            </div>

            {/* Contextual Input Fields based on Selected API */}
            {selectedApi && (
              <div className="rounded-xl border border-hairline bg-canvas p-4 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Info className="h-4 w-4" /> Endpoint Parameters
                </p>

                {/* Shared Domain Name Field */}
                {(selectedApi === 'registerDomain' || selectedApi === 'createZone') && (
                  <div>
                    <label className="block text-sm font-semibold text-ink">Domain FQDN</label>
                    <Input
                      className="mt-2"
                      placeholder="e.g. test.dpdns.org"
                      value={paramDomain}
                      onChange={(e) => setParamDomain(e.target.value)}
                    />
                  </div>
                )}

                {/* DPDNS Register Params */}
                {selectedApi === 'registerDomain' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-ink">Slot Type</label>
                      <Select className="mt-2" value={paramSlotType} onChange={(e) => setParamSlotType(e.target.value)}>
                        <option value="free">free</option>
                        <option value="paid">paid</option>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink">Nameservers (comma or line separated)</label>
                      <textarea
                        rows={2}
                        className="mt-2 w-full rounded-lg border border-hairline bg-white p-3 text-sm text-ink focus:border-primary focus:outline-none"
                        placeholder="anna.ns.cloudflare.com, bob.ns.cloudflare.com"
                        value={paramNameservers}
                        onChange={(e) => setParamNameservers(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Cloudflare Zone ID Params */}
                {(selectedApi === 'getDnsRecords' || selectedApi === 'createDnsRecord' || selectedApi === 'deleteDnsRecord') && (
                  <div>
                    <label className="block text-sm font-semibold text-ink">Zone ID</label>
                    <Input
                      className="mt-2"
                      placeholder="Enter 32-char Cloudflare Zone ID"
                      value={paramZoneId}
                      onChange={(e) => setParamZoneId(e.target.value)}
                    />
                  </div>
                )}

                {/* Cloudflare Delete DNS Record Param */}
                {selectedApi === 'deleteDnsRecord' && (
                  <div>
                    <label className="block text-sm font-semibold text-ink">DNS Record ID</label>
                    <Input
                      className="mt-2"
                      placeholder="Enter DNS Record ID to delete"
                      value={paramRecordId}
                      onChange={(e) => setParamRecordId(e.target.value)}
                    />
                  </div>
                )}

                {/* Cloudflare Create DNS Record Params */}
                {selectedApi === 'createDnsRecord' && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-sm font-semibold text-ink">Record Type</label>
                        <Select className="mt-2" value={paramRecordType} onChange={(e) => setParamRecordType(e.target.value)}>
                          <option value="A">A (IPv4 Address)</option>
                          <option value="AAAA">AAAA (IPv6 Address)</option>
                          <option value="CNAME">CNAME (Alias)</option>
                          <option value="TXT">TXT (Text)</option>
                          <option value="MX">MX (Mail Exchange)</option>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink">Record Name (Subdomain/Root)</label>
                        <Input
                          className="mt-2"
                          placeholder="e.g. @ or api"
                          value={paramRecordName}
                          onChange={(e) => setParamRecordName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-ink">TTL (seconds)</label>
                        <Input
                          className="mt-2"
                          type="number"
                          placeholder="3600"
                          value={paramRecordTtl}
                          onChange={(e) => setParamRecordTtl(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-ink">Record Content (Target Value)</label>
                      <Input
                        className="mt-2"
                        placeholder="e.g. 192.168.1.1 or mytunnel.cfargotunnel.com"
                        value={paramRecordContent}
                        onChange={(e) => setParamRecordContent(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="proxied"
                        checked={paramRecordProxied}
                        onChange={(e) => setParamRecordProxied(e.target.checked)}
                        className="h-4 w-4 rounded border-hairline text-primary focus:ring-primary"
                      />
                      <label htmlFor="proxied" className="text-sm font-medium text-ink select-none cursor-pointer">
                        Cloudflare Proxied (Orange Cloud)
                      </label>
                    </div>
                  </div>
                )}

                {/* Cloudflare Tunnel Create Params */}
                {selectedApi === 'createTunnel' && (
                  <div>
                    <label className="block text-sm font-semibold text-ink">Tunnel Name</label>
                    <Input
                      className="mt-2"
                      placeholder="e.g. home-server"
                      value={paramTunnelName}
                      onChange={(e) => setParamTunnelName(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Execute trigger */}
            <div className="flex justify-end pt-2">
              <Button onClick={executeApi} disabled={isLoading || !selectedAccountId} className="w-full md:w-auto">
                <Play className={`mr-2 h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Executing Request...' : 'Send API Request'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Response Display Section */}
      {(apiResponse || apiError) && (
        <section className="feature-card border-t border-hairline">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <FileJson className="h-5 w-5 text-muted" /> Response Console
            </h3>
            {apiResponse && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(JSON.stringify(apiResponse, null, 2))}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={handleSaveAsset}>
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Diagnostic Asset
                </Button>
              </div>
            )}
          </div>

          {apiError ? (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4 font-mono text-sm text-red-700">
              {apiError}
            </div>
          ) : (
            <pre className="max-h-96 overflow-auto rounded-lg border border-hairline bg-surface-soft p-4 font-mono text-xs text-ink leading-relaxed whitespace-pre-wrap">
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          )}
        </section>
      )}

      {/* Saved Diagnostic Assets Section */}
      <section className="feature-card">
        <h2 className="mb-4 text-xl font-semibold text-ink flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Saved Diagnostic Assets
        </h2>
        <p className="mb-6 text-sm text-body">
          Saved historical payloads (Tunnels, DNS Configurations, Profiles) for offline referencing and diagnostics.
        </p>

        {savedAssets.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-hairline rounded-xl bg-surface-soft">
            <p className="text-body text-sm">No diagnostic assets saved yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {savedAssets.map((asset) => (
              <div key={asset._key} className="py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink text-sm">{asset.name}</span>
                    <span className="pill-badge bg-emerald-50 text-emerald-700 text-xs border border-emerald-100 uppercase">
                      {asset.asset_type}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span>Account: {asset.associated_account_name}</span>
                    <span>•</span>
                    <span>Saved: {new Date(asset.saved_at).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" size="sm" onClick={() => copyToClipboard(JSON.stringify(asset.data, null, 2))}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Data
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteAsset(asset)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
