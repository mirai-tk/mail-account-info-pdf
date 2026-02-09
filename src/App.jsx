import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  Printer,
  FileText,
  FileType2,
  Plus,
  Trash2,
  Settings,
  Save,
  Layout,
  ExternalLink,
  CircleCheck,
  Circle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

const PORT_OPTIONS = [
  { id: 'pop3', type: '受信用', protocol: 'POP3', port: '110', crypto: '×' },
  { id: 'pop_ssl', type: '受信用', protocol: 'POP over SSL', port: '995', crypto: '○' },
  { id: 'imap', type: '受信用', protocol: 'IMAP', port: '143', crypto: '×' },
  { id: 'imap_ssl', type: '受信用', protocol: 'IMAP over SSL', port: '993', crypto: '○' },
  { id: 'smtp', type: '送信用', protocol: 'SMTP', port: '587', crypto: '×' },
  { id: 'smtp_ssl', type: '送信用', protocol: 'SMTP over SSL', port: '465', crypto: '○' },
];

const App = () => {
  const [presets, setPresets] = useState({});
  const [currentPresetName, setCurrentPresetName] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [config, setConfig] = useState({
    receiveServer: 'example.jp',
    sendServer: 'example.jp',
    manualUrl: 'https://example.jp',
    selectedPorts: ['pop_ssl', 'imap_ssl', 'smtp_ssl']
  });

  const [accounts, setAccounts] = useState([
    { email: '', password: '' }
  ]);

  const printRef = useRef(null);

  useEffect(() => {
    const savedPresets = localStorage.getItem('email_tool_presets_v6');
    if (savedPresets) {
      const parsed = JSON.parse(savedPresets);
      setPresets(parsed);
      const firstKey = Object.keys(parsed)[0];
      if (firstKey) {
        setConfig(parsed[firstKey]);
        setCurrentPresetName(firstKey);
      }
    }
  }, []);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => { setErrorMessage(''); }, 5000);
  };

  const savePreset = () => {
    const name = newPresetName || currentPresetName;
    if (!name) return;
    const updatedPresets = { ...presets, [name]: { ...config } };
    setPresets(updatedPresets);
    localStorage.setItem('email_tool_presets_v6', JSON.stringify(updatedPresets));
    setCurrentPresetName(name);
    setNewPresetName('');
  };

  const loadPreset = (name) => {
    if (presets[name]) {
      setConfig(presets[name]);
      setCurrentPresetName(name);
    }
  };

  const deletePreset = (name) => {
    const newPresets = { ...presets };
    delete newPresets[name];
    setPresets(newPresets);
    localStorage.setItem('email_tool_presets_v6', JSON.stringify(newPresets));
    if (currentPresetName === name) setCurrentPresetName('');
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handlePortToggle = (portId) => {
    setConfig(prev => {
      const isSelected = prev.selectedPorts.includes(portId);
      const newPorts = isSelected
        ? prev.selectedPorts.filter(id => id !== portId)
        : [...prev.selectedPorts, portId];
      return { ...prev, selectedPorts: newPorts };
    });
  };

  const updateAccount = (index, field, value) => {
    const newAccounts = [...accounts];
    newAccounts[index][field] = value;
    setAccounts(newAccounts);
  };

  const addAccount = () => setAccounts([...accounts, { email: '', password: '' }]);
  const removeAccount = (index) => {
    if (accounts.length > 1) setAccounts(accounts.filter((_, i) => i !== index));
  };

  const exportWord = async () => {
    try {
      // Create header section
      const headerParagraphs = [
        new Paragraph({
          text: "メール設定情報のご案内",
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `発行日: ${new Date().toLocaleDateString('ja-JP')}`,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "いつも大変お世話になっております。メールソフトの設定情報を下記の通りご案内申し上げます。",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "お手数ですが、お手持ちの端末（PC・スマートフォン等）にて設定をお願いいたします。",
          spacing: { after: 300 },
        }),
      ];

      // Server info section
      const serverInfoHeader = new Paragraph({
        text: "サーバー基本情報",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      });

      const serverInfoTable = new Table({
        width: { size: 75, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "受信サーバー", bold: true })],
                shading: { fill: "f9fafb" },
              }),
              new TableCell({
                children: [new Paragraph({ text: config.receiveServer })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: "送信サーバー (SMTP)", bold: true })],
                shading: { fill: "f9fafb" },
              }),
              new TableCell({
                children: [new Paragraph({ text: config.sendServer })],
              }),
            ],
          }),
        ],
      });

      // Port settings table
      const portTableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "区分", bold: true, color: "FFFFFF" })]
              })],
              shading: { fill: "475569" }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "プロトコル", bold: true, color: "FFFFFF" })]
              })],
              shading: { fill: "475569" }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "ポート番号", bold: true, color: "FFFFFF" })]
              })],
              shading: { fill: "475569" }
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: "暗号化", bold: true, color: "FFFFFF" })]
              })],
              shading: { fill: "475569" }
            }),
          ],
        }),
      ];

      PORT_OPTIONS.forEach((p, idx) => {
        const isSelected = config.selectedPorts.includes(p.id);
        const cells = [];

        if (idx === 0) {
          cells.push(new TableCell({
            children: [new Paragraph({ text: "受信用", bold: true })],
            rowSpan: 4,
            shading: { fill: "f9fafb" },
          }));
        } else if (idx === 4) {
          cells.push(new TableCell({
            children: [new Paragraph({ text: "送信用", bold: true })],
            rowSpan: 2,
            shading: { fill: "f9fafb" },
          }));
        }

        cells.push(
          new TableCell({
            children: [new Paragraph({ text: `${isSelected ? '●' : '○'} ${p.protocol}` })],
          }),
          new TableCell({
            children: [new Paragraph({ text: p.port })],
          }),
          new TableCell({
            children: [new Paragraph({ text: p.crypto })],
          })
        );

        portTableRows.push(new TableRow({ children: cells }));
      });

      const portTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: portTableRows,
      });

      // Account info section
      const accountInfoHeader = new Paragraph({
        text: "アカウント別ログイン情報",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      });

      const accountTableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: "メールアドレス / ユーザー名", bold: true })], shading: { fill: "f9fafb" } }),
            new TableCell({ children: [new Paragraph({ text: "パスワード", bold: true })], shading: { fill: "f9fafb" } }),
          ],
        }),
      ];

      accounts.forEach((acc) => {
        accountTableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: acc.email || '-' })] }),
              new TableCell({ children: [new Paragraph({ text: acc.password || '-' })] }),
            ],
          })
        );
      });

      const accountTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: accountTableRows,
      });

      // Footer notes
      const footerParagraphs = [
        new Paragraph({
          text: "※ パスワードは機密情報です。管理には十分ご注意ください。",
          spacing: { before: 300, after: 100 },
        }),
        new Paragraph({
          text: "※ セキュリティ保護のため、他者と共有したり公共の場に放置したりしないでください。",
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "※ 設定に際して不明な点がございましたら、サポート担当までご連絡ください。",
        }),
      ];

      if (config.manualUrl) {
        footerParagraphs.unshift(
          new Paragraph({
            text: `設定マニュアル: ${config.manualUrl}`,
            spacing: { before: 300, after: 200 },
          })
        );
      }

      // Create document
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 720,    // 0.5 inch (720 twips = 0.5 inch)
                right: 720,
                bottom: 720,
                left: 720,
              },
            },
          },
          children: [
            ...headerParagraphs,
            serverInfoHeader,
            serverInfoTable,
            new Paragraph({ spacing: { after: 200 } }),
            portTable,
            accountInfoHeader,
            accountTable,
            ...footerParagraphs,
          ],
        }],
      });

      // Generate and save
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `mail_settings_${new Date().toISOString().slice(0, 10)}.docx`);
    } catch (error) {
      console.error("Word export failed:", error);
      showError("Word出力に失敗しました。");
    }
  };

  const generatePDF = async () => {
    const element = printRef.current;
    if (!element) return;

    // Reset scroll for accurate capture
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    try {
      // Use html-to-image for better baseline stability
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        style: {
          boxShadow: 'none',
          margin: '0',
          transform: 'none'
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`mail_settings_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      showError("PDF生成に失敗しました。詳細： " + error.message);
    } finally {
      window.scrollTo(0, originalScrollY);
    }
  };

  const handlePrintAction = () => {
    const content = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { showError("ポップアップがブロックされました。"); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>印刷 - メール設定情報</title>
          <script src="https://cdn.tailwindcss.com"><\/script>
          <style>
            body { background: white !important; margin: 0; padding: 0; font-family: sans-serif; }
            .no-print { display: none !important; }
            #print-wrapper { padding: 10mm; width: 210mm; margin: 0 auto; box-sizing: border-box; }
            @page { size: A4; margin: 0; }
            .pdf-header-bar {
              background-color: #1e3a8a !important;
              color: white !important;
              padding: 4px 12px !important;
              display: block !important;
              width: fit-content !important;
              font-weight: bold !important;
              font-size: 11px !important;
              margin-bottom: 6px !important;
              border-radius: 2px;
              margin-left: auto;
              margin-right: auto;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .check-table { width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; }
            .check-table th, .check-table td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: center; line-height: 1.4; font-size: 13px; }
            .check-table thead th { background-color: #475569 !important; color: white !important; -webkit-print-color-adjust: exact; }
            .marker-cell { display: inline-flex; width: 20px; justify-content: center; align-items: center; vertical-align: middle; line-height: 1; }
          </style>
        </head>
        <body>
          <div id="print-wrapper">${content}</div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); window.close(); }, 800);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      {errorMessage && (
        <div className="message-overlay !block">
          {errorMessage}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8 no-print">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="text-blue-600" size={24} />
              メール設定情報生成ツール
            </h1>
            <p className="text-sm text-gray-500 font-medium">A4出力用</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handlePrintAction} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition shadow-sm font-bold">
              <Printer size={16} /> 印刷
            </button>
            <button onClick={generatePDF} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-bold">
              <FileText size={16} /> PDF出力
            </button>
            <button onClick={exportWord} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm font-bold">
              <FileType2 size={16} /> Word出力
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="text-gray-400" size={20} /> プリセット管理
              </h2>
              <p className="text-sm text-gray-500 mb-4">メールアカウント情報は保存されません。</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">保存済みプリセット</label>
                  <div className="flex gap-2">
                    <select className="flex-1 bg-gray-50 border border-gray-300 text-sm rounded-lg p-2 focus:outline-none" value={currentPresetName} onChange={(e) => loadPreset(e.target.value)}>
                      <option value="">未選択</option>
                      {Object.keys(presets).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    {currentPresetName && <button onClick={() => deletePreset(currentPresetName)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={20} /></button>}
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">新規保存名</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder="名前入力" className="flex-1 bg-gray-50 border border-gray-300 text-sm rounded-lg p-2 focus:outline-none" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} />
                    <button onClick={savePreset} className="bg-gray-800 text-white p-2 rounded-lg hover:bg-gray-700 transition"><Save size={20} /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-6 pb-2 border-b border-gray-100">サーバー基本設定</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">受信メールサーバー</label>
                  <input type="text" name="receiveServer" value={config.receiveServer} onChange={handleConfigChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">送信サーバー (SMTP)</label>
                  <input type="text" name="sendServer" value={config.sendServer} onChange={handleConfigChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 font-mono" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 font-bold">マニュアルURL</label>
                  <input type="text" name="manualUrl" value={config.manualUrl} onChange={handleConfigChange} className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5" />
                </div>
              </div>

              <h3 className="text-md font-semibold mb-4 flex items-center gap-2">
                ポート設定 <span className="text-xs font-normal text-gray-400 font-bold">※案内に含める項目をチェック</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="check-table text-sm">
                  <thead>
                    <tr>
                      <th className="w-12 border border-gray-300 text-white">案内</th>
                      <th className="border border-gray-300 text-white">区分</th>
                      <th className="text-left px-3 border border-gray-300 text-white">プロトコル</th>
                      <th className="border border-gray-300 text-white">ポート</th>
                      <th className="border border-gray-300 text-white">暗号化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PORT_OPTIONS.map((p, idx) => (
                      <tr key={p.id} className={config.selectedPorts.includes(p.id) ? "bg-blue-50 font-bold" : "bg-white text-gray-400"}>
                        <td><input type="checkbox" checked={config.selectedPorts.includes(p.id)} onChange={() => handlePortToggle(p.id)} className="w-4 h-4 cursor-pointer" /></td>
                        {idx === 0 && <td rowSpan="4" className="bg-gray-50 font-bold border border-gray-300 text-gray-700">受信用</td>}
                        {idx === 4 && <td rowSpan="2" className="bg-gray-50 font-bold border border-gray-300 text-gray-700">送信用</td>}
                        <td className="text-left px-4 border border-gray-300">{p.protocol}</td>
                        <td className="font-mono border border-gray-300">{p.port}</td>
                        <td className="border border-gray-300">{p.crypto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">メールアカウント情報</h2>
                <button onClick={addAccount} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1 font-medium transition-colors"><Plus size={14} /> 追加</button>
              </div>
              <div className="space-y-4">
                {accounts.map((acc, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 p-4 rounded-lg relative border border-transparent hover:border-blue-200 transition">
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">メールアドレス / ユーザー名</label>
                      <input type="email" placeholder="info@example.jp" className="w-full bg-white border border-gray-200 rounded p-2 text-sm focus:outline-none font-mono" value={acc.email} onChange={(e) => updateAccount(index, 'email', e.target.value)} />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">パスワード</label>
                      <input type="text" placeholder="password" className="w-full bg-white border border-gray-200 rounded p-2 text-sm focus:outline-none font-mono" value={acc.password} onChange={(e) => updateAccount(index, 'password', e.target.value)} />
                    </div>
                    <button onClick={() => removeAccount(index)} className="mt-4 md:mt-0 p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* A4 Preview Area */}
      <div className="mt-12 overflow-x-auto no-print">
        <h3 className="text-center text-gray-400 mb-4 flex items-center justify-center gap-2 font-medium"><Layout size={16} /> A4サイズ プレビュー</h3>
        <div className="flex justify-center pb-20">
          <div ref={printRef} id="print-area" className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm', padding: '10mm', boxSizing: 'border-box' }}>
            <div className="flex justify-between items-start border-b-2 border-blue-600 pb-2 mb-4">
              <div>
                <h1 className="text-lg font-bold text-blue-900 mb-0.5">メール設定情報のご案内</h1>
                <p className="text-[9px] text-gray-500 italic uppercase">Email Account Configuration Information</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">発行日: {new Date().toLocaleDateString('ja-JP')}</p>
              </div>
            </div>

            <p className="mb-4 text-sm leading-tight text-gray-700 font-bold">いつも大変お世話になっております。メールソフトの設定情報を下記の通りご案内申し上げます。<br />お手数ですが、お手持ちの端末（PC・スマートフォン等）にて設定をお願いいたします。</p>

            <div className="mb-5">
              <div className="pdf-header-bar mx-auto">サーバー基本情報</div>
              <table className="w-3/4 mx-auto border-collapse border border-gray-300 text-sm mb-1">
                <tbody>
                  <tr>
                    <th className="w-1/3 border border-gray-300 bg-gray-50 px-4 text-left font-bold text-gray-700">受信サーバー</th>
                    <td className="border border-gray-300 px-4 font-mono font-bold text-blue-800 text-base">{config.receiveServer}</td>
                  </tr>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 px-4 text-left font-bold text-gray-700">送信サーバー (SMTP)</th>
                    <td className="border border-gray-300 px-4 font-mono font-bold text-blue-800 text-base">{config.sendServer}</td>
                  </tr>
                </tbody>
              </table>

              <table className="check-table text-sm mt-5">
                <thead>
                  <tr>
                    <th className="w-20">区分</th>
                    <th className="w-40 text-left px-5 font-bold">プロトコル</th>
                    <th className="w-24 font-bold">ポート番号</th>
                    <th className="w-20 font-bold">暗号化</th>
                  </tr>
                </thead>
                <tbody>
                  {PORT_OPTIONS.map((p, idx) => {
                    const isSelected = config.selectedPorts.includes(p.id);
                    return (
                      <tr key={p.id} className={isSelected ? "font-bold text-black" : "text-gray-300"}>
                        {idx === 0 && <td rowSpan="4" className="bg-gray-50 text-gray-800 border border-gray-300 font-bold">受信用</td>}
                        {idx === 4 && <td rowSpan="2" className="bg-gray-50 text-gray-800 border border-gray-300 font-bold">送信用</td>}
                        <td className="text-left px-4 border border-gray-300">
                          <span className="marker-cell">
                            {isSelected ? (
                              <CircleCheck size={14} className="text-blue-600" />
                            ) : (
                              <Circle size={14} className="text-gray-300" />
                            )}
                          </span>
                          <span className="ml-1">{p.protocol}</span>
                        </td>
                        <td className="font-mono border border-gray-300">{p.port}</td>
                        <td className="border border-gray-300">{p.crypto}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[9px] text-gray-400 mt-1 font-bold">※ ●印がついている設定が推奨または利用可能なポートです。</p>
            </div>

            <div className="mb-5">
              <div className="pdf-header-bar mx-auto">アカウント別ログイン情報</div>
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 text-left font-bold text-gray-700">メールアドレス / ユーザー名</th>
                    <th className="border border-gray-300 px-4 text-left w-2/5 font-bold text-gray-700">パスワード</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc, i) => (
                    <tr key={i}>
                      <td className="border border-gray-300 px-4 font-mono font-bold text-blue-800 break-all">{acc.email || '-'}</td>
                      <td className="border border-gray-300 px-4 font-mono font-bold text-blue-800 break-all">{acc.password || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {config.manualUrl && (
              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 mb-3">
                <div className="text-[9px] font-bold text-gray-500 mb-1 flex items-center gap-2 uppercase tracking-wider">
                  <ExternalLink size={10} /> 設定マニュアル
                </div>
                <div className="bg-white p-1.5 border border-gray-300 text-xs font-mono text-blue-700 rounded break-all leading-normal">{config.manualUrl}</div>
              </div>
            )}

            <div className="mt-auto text-[8px] text-gray-400 space-y-0.5 font-bold leading-tight">
              <p>※ パスワードは機密情報です。管理には十分ご注意ください。</p>
              <p>※ セキュリティ保護のため、他者と共有したり公共の場に放置したりしないでください。</p>
              <p>※ 設定に際して不明な点がございましたら、サポート担当までご連絡ください。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
