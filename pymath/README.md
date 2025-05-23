# Python Mathe-Operatoren

Dieses Repository enthält Implementierungen verschiedener nützlicher mathematischer Operatoren in Python.

## Funktionen

-   `fakultaet(n)`: Berechnet die Fakultät einer nicht-negativen ganzen Zahl.
-   `fibonacci(n)`: Berechnet die n-te Fibonacci-Zahl.
-   `ist_primzahl(n)`: Überprüft, ob eine Zahl eine Primzahl ist.
-   `ggt(a, b)`: Berechnet den größten gemeinsamen Teiler (ggT) von zwei ganzen Zahlen.
-   `kgv(a, b)`: Berechnet das kleinste gemeinsame Vielfache (kgV) von zwei ganzen Zahlen.
-   `ist_quadratzahl(n)`: Überprüft, ob eine Zahl eine Quadratzahl ist.

## Installation

Dieses Projekt ist derzeit eine einzelne Python-Datei. Um die Funktionen zu nutzen, können Sie entweder:

**Kopieren und Einfügen**: Kopieren Sie den Inhalt von `lib/math.py` in Ihr eigenes Projekt.

**Als Modul importieren**: Platzieren Sie `lib/math.py` in einem Verzeichnis innerhalb Ihres Python-Pfads und importieren Sie die gewünschten Funktionen:

```python
from lib.math import fakultaet, ist_primzahl
```

## Anwendungsbeispiel

```python
from math_operatoren import fakultaet, fibonacci, ggt

# Berechne die Fakultät von 6
ergebnis = fakultaet(6)
print(ergebnis) # Ausgabe: 720

# Finde die 10. Fibonacci-Zahl
fib_zahl = fibonacci(10)
print(fib_zahl) # Ausgabe: 55

# Berechne den ggT von 96 und 64
groesster_teiler = ggt(96, 64)
print(groesster_teiler) # Ausgabe: 32
```

## Mitwirken

Wir freuen uns über Beiträge zur Verbesserung und Erweiterung dieser Sammlung von mathematischen Operatoren. Wenn Sie neue Funktionen haben oder Verbesserungen an bestehenden finden, folgen Sie bitte diesen Schritten:

1.  Forken Sie das Repository.
2.  Erstellen Sie einen neuen Branch.
3.  Machen Sie Ihre Änderungen, einschließlich klarer Kommentare und Tests (falls zutreffend).
4.  Senden Sie einen Pull-Request zur Überprüfung.

## Lizenz

Dieser Code wird unter der MIT-Lizenz veröffentlicht. Weitere Details finden Sie in der Datei LICENSE.
