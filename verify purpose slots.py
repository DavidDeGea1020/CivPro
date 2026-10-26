"""Check a JD Change Template for the inline Purpose slots.

Usage:  python verify_purpose_slots.py "JD Change Template - User.docx"
Prints PASS or FAIL with the reasons. Run it on both the User and HR templates.
"""
import sys, zipfile
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W}
ORDER = [f"Purpose{t}{i}" for i in range(1, 6) for t in "KRA"] + ["PurposeKEnd"]
REMOVED = ["PurposeRows", "PurposeKept", "PurposeAdded", "PurposeRemoved"]
STYLE = {"R": "JDRemoved", "A": "JDAdded"}

def val(el, path):
    r = el.xpath(path, namespaces=NS)
    return r[0] if r else None

def main(path):
    errors, warnings = [], []
    with zipfile.ZipFile(path) as z:
        root = etree.fromstring(z.read("word/document.xml"))
        styles = z.read("word/styles.xml").decode("utf-8", "ignore")
    sdts = root.xpath("//w:sdt", namespaces=NS)
    by_tag = {}
    for s in sdts:
        tag = val(s, "w:sdtPr/w:tag/@w:val")
        if tag:
            by_tag.setdefault(tag, []).append(s)

    for t in REMOVED:
        if t in by_tag:
            errors.append(f"Old control '{t}' is still in the template. Delete the PurposeRows repeating section.")

    for t in ORDER:
        n = len(by_tag.get(t, []))
        if n == 0:
            errors.append(f"Missing control '{t}'.")
        elif n > 1:
            errors.append(f"Control '{t}' appears {n} times (must be once).")

    for t in by_tag:
        if t.startswith("Purpose") and t not in ORDER and t not in REMOVED:
            errors.append(f"Unexpected control '{t}' (typo?). Expected names: {', '.join(ORDER)}")

    for s in ("JDAdded", "JDRemoved"):
        if f'w:styleId="{s}"' not in styles:
            errors.append(f"Style '{s}' not found in the template.")

    found = [t for t in ORDER if len(by_tag.get(t, [])) == 1]
    paras = set()
    for t in found:
        s = by_tag[t][0]
        parent = s.getparent()
        if parent.tag != f"{{{W}}}p":
            errors.append(f"'{t}' is not inline. It must sit inside the Purpose paragraph, not around it.")
        else:
            paras.add(id(parent))
        if s.xpath("ancestor::w:sdt[w:sdtPr/w15:repeatingSection]",
                   namespaces={**NS, "w15": "http://schemas.microsoft.com/office/word/2012/wordml"}):
            errors.append(f"'{t}' is inside a repeating section. The slots must be plain, not repeating.")
        if val(s, "w:sdtPr/w:text") is None:
            errors.append(f"'{t}' is not a Plain Text content control.")
        alias = val(s, "w:sdtPr/w:alias/@w:val")
        if alias != t:
            errors.append(f"'{t}' has Title '{alias}'. Title and Tag must match.")
        kind = "K" if t == "PurposeKEnd" else t[7]
        style = val(s, "w:sdtPr/w:rPr/w:rStyle/@w:val")
        want = STYLE.get(kind)
        if want and style != want:
            errors.append(f"'{t}' must use style '{want}' (found '{style}'). Properties > Use a style > {want}.")
        if not want and style in ("JDAdded", "JDRemoved"):
            errors.append(f"'{t}' is a kept-text slot but uses style '{style}'. Clear the style.")
        text = "".join(s.xpath(".//w:sdtContent//w:t/text()", namespaces=NS))
        if text.replace("​", "").strip():
            warnings.append(f"'{t}' shows text '{text[:30]}'. Clear the placeholder to a zero-width space (200B, Alt+X).")

    if len(paras) > 1:
        errors.append("The 16 Purpose slots are split across more than one paragraph. Put them all on one line.")

    if len(found) == len(ORDER) and len(paras) == 1:
        p = by_tag[ORDER[0]][0].getparent()
        seq = [val(s, "w:sdtPr/w:tag/@w:val") for s in p.xpath("w:sdt", namespaces=NS)]
        seq = [x for x in seq if x in ORDER]
        if seq != ORDER:
            errors.append("Slots are out of order. Expected: " + " ".join(ORDER) + "\n      Found:    " + " ".join(seq))
        if p.xpath("w:pPr/w:rPr/w:vanish", namespaces=NS):
            warnings.append("The Purpose paragraph mark is Hidden (left over from the earlier approach). Un-hide it: select the ¶, Ctrl+D, uncheck Hidden.")

    print(f"\n{path}")
    for e in errors:
        print("  FAIL  " + e)
    for w in warnings:
        print("  WARN  " + w)
    print("  RESULT: " + ("PASS" if not errors else "FAIL") + f"  ({len(found)}/16 slots found)")
    return not errors

if __name__ == "__main__":
    ok = all(main(p) for p in sys.argv[1:])
    sys.exit(0 if ok else 1)
