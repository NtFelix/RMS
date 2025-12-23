'use client';

import { useState } from 'react';
import { TemplateEditor } from './template-editor';
import { JSONContent } from '@tiptap/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function TemplateEditorDemo() {
  const [content, setContent] = useState<string>('');
  const [jsonContent, setJsonContent] = useState<JSONContent | null>(null);

  const handleChange = (html: string, json: JSONContent) => {
    setContent(html);
    setJsonContent(json);
  };

  const clearContent = () => {
    setContent('');
    setJsonContent(null);
  };

  const loadSampleContent = () => {
    const sampleContent = `<p>Sehr geehrte/r @Mieter.Name,</p><p>hiermit möchten wir Sie über die anstehende Betriebskostenabrechnung für die Wohnung @Wohnung.Adresse informieren.</p><p><strong>Details:</strong></p><ul><li>Abrechnungszeitraum: 01.01.2024 - 31.12.2024</li><li>Wohnung: @Wohnung.Adresse</li><li>Mieter: @Mieter.Name</li></ul><p>Mit freundlichen Grüßen<br>@Vermieter.Name</p>`;
    setContent(sampleContent);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Template Editor Demo</CardTitle>
          <div className="flex gap-2">
            <Button onClick={loadSampleContent} variant="outline" size="sm">
              Beispielinhalt laden
            </Button>
            <Button onClick={clearContent} variant="outline" size="sm">
              Inhalt löschen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <TemplateEditor
            content={content}
            onChange={handleChange}
            placeholder="Beginnen Sie mit der Eingabe... Verwenden Sie @ für Variablen wie @Mieter.Name"
            className="min-h-[300px]"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">HTML Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
              {content || 'Kein Inhalt'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">JSON Output</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-50 p-4 rounded-md overflow-auto max-h-64">
              {jsonContent ? JSON.stringify(jsonContent, null, 2) : 'Kein Inhalt'}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Verfügbare Variablen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Mieter</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>@Mieter.Name</li>
                <li>@Mieter.Vorname</li>
                <li>@Mieter.Nachname</li>
                <li>@Mieter.Email</li>
                <li>@Mieter.Telefon</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Wohnung</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>@Wohnung.Adresse</li>
                <li>@Wohnung.Straße</li>
                <li>@Wohnung.Hausnummer</li>
                <li>@Wohnung.PLZ</li>
                <li>@Wohnung.Ort</li>
                <li>@Wohnung.Zimmer</li>
                <li>@Wohnung.Größe</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Sonstiges</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>@Haus.Name</li>
                <li>@Haus.Adresse</li>
                <li>@Datum.Heute</li>
                <li>@Datum.Monat</li>
                <li>@Datum.Jahr</li>
                <li>@Vermieter.Name</li>
                <li>@Vermieter.Adresse</li>
                <li>@Vermieter.Telefon</li>
                <li>@Vermieter.Email</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}