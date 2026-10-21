# Agent Spec: Add Education Level and Experience Redline Controls

You are updating an existing Microsoft Word template (`.docx`) that a Power Automate flow fills in with the **Populate a Microsoft Word template** action. The template already has all its other content controls and formatting. Your job is to make **one targeted change**: replace two single text controls with two redline repeating sections. **Change nothing else.**

The flow matches controls **by name**. A misspelled name, a wrong control type, or a duplicated name will blank a section or produce a file Word can't open. Follow this spec exactly.

---

## 1. Input and output

**You receive:** `JD Change Template.docx`, the current template, already containing the controls listed in Section 7.

**You produce:** the same file with only these changes:

| Location | Remove | Add |
|---|---|---|
| Education table, data row, **Education Level** column | Plain text control `EducationLevel` | Repeating section `EduLevelRows`, containing `EduLevelKept`, `EduLevelAdded`, `EduLevelRemoved` |
| Work Experience table, data row, **Experience** column | Plain text control `ExperienceLevel` | Repeating section `ExpLevelRows`, containing `ExpLevelKept`, `ExpLevelAdded`, `ExpLevelRemoved` |

**You verify:** run the script in Section 6. It must print `RESULT: PASS` with **45** controls.

---

## 2. How the flow uses these controls

Each repeating section holds **one item**: a paragraph with three Plain Text controls side by side.
- `…Kept`: unchanged text. No style.
- `…Added`: new text. Character style **JD Added** (style ID `JDAdded`: bold, yellow shading).
- `…Removed`: deleted text. Character style **JD Removed** (style ID `JDRemoved`: red, strikethrough).

For each value, the flow copies the item and fills exactly **one** of the three controls. Empty controls must show nothing, so each holds a single zero-width space (U+200B), never placeholder text.

Example of what the flow sends for Education Level when it changes:
```json
[
  {"EduLevelKept": "", "EduLevelAdded": "Bachelors Degree", "EduLevelRemoved": ""},
  {"EduLevelKept": "", "EduLevelAdded": "", "EduLevelRemoved": "High school"}
]
```

**The pattern already exists in this template.** The **Req/Pref** cells in the same two rows contain `EduReqRows` and `ExpReqRows`, built exactly this way. Copy their structure.

---

## 3. Hard rules

1. **Touch only the two cells** named in Section 1. Don't change any other control, cell, table, style, text, font, spacing, the logo or the page setup.
2. **Remove** `EducationLevel` and `ExperienceLevel` completely. Neither name may remain anywhere in the document.
3. **Plain Text controls only** for the six inner controls (`<w:text/>`). Never Rich Text.
4. **Title (`w:alias`) = Tag (`w:tag`)**, set to the exact names in Section 1. Names are case-sensitive and contain no spaces.
5. **Every name is unique.** If you copy the Req/Pref section, rename **all four** of its names (the repeating section and its three inner controls). A leftover duplicate such as a second `EduReqKept` is the most likely failure.
6. **Every `<w:id>` is unique** across the whole document. Give each new `<w:sdt>` a new integer that isn't used anywhere else.
7. **Styles:** `…Added` uses `JDAdded` and `…Removed` uses `JDRemoved`, in both the control's `sdtPr` and its placeholder run. `…Kept` has no style. Don't create new styles; these two already exist in `styles.xml`.
8. **No placeholder text.** Each inner control contains one run with one zero-width space (U+200B).
9. **One item per repeating section**, wrapping one paragraph. The paragraph sits inside the table cell.
10. **The table cell must still be valid.** The repeating section replaces the cell's paragraph that held the old control, and the cell's `<w:tcPr>` stays as it is.
11. Keep the cell's existing paragraph formatting (`w:pPr`, such as spacing) on the new paragraph, so the row looks the same.
12. Don't reformat, pretty-print or reorder the rest of `document.xml`.

---

## 4. What to change, step by step

1. Unzip the `.docx`. Work in `word/document.xml`.
2. If runs are fragmented, merge adjacent identically formatted runs first, so the controls are easy to find.
3. Find the `<w:sdt>` whose `<w:tag w:val="EducationLevel"/>`. It's inside a paragraph (`<w:p>`) in the Education table's data row, in the first cell.
4. Replace **that whole paragraph** (the `<w:p>` containing the control) with the `EduLevelRows` block from Section 5, keeping the original paragraph's `<w:pPr>` on the new `<w:p>` if it had one.
5. Do the same for `<w:tag w:val="ExperienceLevel"/>` in the Work Experience table's first cell, using the `ExpLevelRows` block.
6. Re-zip with the same file structure (`[Content_Types].xml` at the root).
7. Run Section 6. Fix anything it reports, then run it again.
8. Convert to PDF (e.g., `soffice --headless --convert-to pdf`) and look at the Education and Work Experience tables. They should look exactly as before: empty cells, no placeholder text, same borders and widths.

---

## 5. XML to insert

Replace `ID1`…`ID5` with integers that are unique across the document. Find the highest existing `w:id` and count up from it. The `​` inside each `<w:t>` is a zero-width space (U+200B); make sure it's really there, not an empty string.

**Education Level cell:**
```xml
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="EduLevelRows"/>
    <w:tag w:val="EduLevelRows"/>
    <w:id w:val="ID1"/>
    <w15:repeatingSection/>
  </w:sdtPr>
  <w:sdtContent>
    <w:sdt>
      <w:sdtPr>
        <w:id w:val="ID2"/>
        <w15:repeatingSectionItem/>
      </w:sdtPr>
      <w:sdtContent>
        <w:p>
          <!-- keep the original paragraph's <w:pPr> here if it had one -->
          <w:sdt>
            <w:sdtPr>
              <w:alias w:val="EduLevelKept"/><w:tag w:val="EduLevelKept"/><w:id w:val="ID3"/><w:text/>
            </w:sdtPr>
            <w:sdtContent><w:r><w:t xml:space="preserve">​</w:t></w:r></w:sdtContent>
          </w:sdt>
          <w:sdt>
            <w:sdtPr>
              <w:rPr><w:rStyle w:val="JDAdded"/></w:rPr>
              <w:alias w:val="EduLevelAdded"/><w:tag w:val="EduLevelAdded"/><w:id w:val="ID4"/><w:text/>
            </w:sdtPr>
            <w:sdtContent><w:r><w:rPr><w:rStyle w:val="JDAdded"/></w:rPr><w:t xml:space="preserve">​</w:t></w:r></w:sdtContent>
          </w:sdt>
          <w:sdt>
            <w:sdtPr>
              <w:rPr><w:rStyle w:val="JDRemoved"/></w:rPr>
              <w:alias w:val="EduLevelRemoved"/><w:tag w:val="EduLevelRemoved"/><w:id w:val="ID5"/><w:text/>
            </w:sdtPr>
            <w:sdtContent><w:r><w:rPr><w:rStyle w:val="JDRemoved"/></w:rPr><w:t xml:space="preserve">​</w:t></w:r></w:sdtContent>
          </w:sdt>
        </w:p>
      </w:sdtContent>
    </w:sdt>
  </w:sdtContent>
</w:sdt>
```

**Experience cell:** the same block with five new unique IDs and these names:

| In the block above | Use instead |
|---|---|
| EduLevelRows | `ExpLevelRows` |
| EduLevelKept | `ExpLevelKept` |
| EduLevelAdded | `ExpLevelAdded` |
| EduLevelRemoved | `ExpLevelRemoved` |

**Namespaces:** the document already uses repeating sections, so `w15` is declared on `<w:document>`. Confirm `xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"` is present and `w15` is listed in `mc:Ignorable`.

**If the existing run formatting is customized:** if the `EduReqKept`, `EduReqAdded` and `EduReqRemoved` runs in the Req/Pref cell carry extra run properties (for example a font or size in `w:rPr`), give the new runs the same properties, so the Level text matches the Req/Pref text.

---

## 6. Verification (required)

Save this as `verify_jd_template.py` and run `python3 verify_jd_template.py "JD Change Template.docx"` (requires `lxml`). **Don't deliver the file until it prints `RESULT: PASS` with 45 controls.**

```python
#!/usr/bin/env python3
"""Checks a JD Change Template .docx against the content-control spec.
Usage: python3 verify_jd_template.py "JD Change Template.docx"
Exit code 0 = pass, 1 = fail."""
import sys, zipfile
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W15 = "http://schemas.microsoft.com/office/word/2012/wordml"
NS = {"w": W, "w15": W15}

SINGLE = ["JobTitle", "RelationshipManager", "NMLS", "SalesNonSales", "PeopleManagement"]
REPEATING = {
    "PurposeRows": "Purpose", "DutiesRows": "Duties",
    "EducationRows": "Education", "EduReqRows": "EduReq", "EduLevelRows": "EduLevel",
    "ExperienceRows": "Experience", "ExpReqRows": "ExpReq", "ExpLevelRows": "ExpLevel",
    "KSARows": "KSA", "CertsRows": "Certs",
}
FORBIDDEN = ["Grade", "JobCode", "SalaryType", "SalaryHourly", "Status"]
REPLACED = ["EducationLevel", "ExperienceLevel"]
STYLE_FOR = {"Kept": None, "Added": "JDAdded", "Removed": "JDRemoved"}

def tag_of(sdt):
    t = sdt.find("w:sdtPr/w:tag", NS)
    return t.get(f"{{{W}}}val") if t is not None else None

def alias_of(sdt):
    a = sdt.find("w:sdtPr/w:alias", NS)
    return a.get(f"{{{W}}}val") if a is not None else None

def main(path):
    errors, warnings = [], []
    z = zipfile.ZipFile(path)
    doc = etree.fromstring(z.read("word/document.xml"))
    styles = etree.fromstring(z.read("word/styles.xml"))
    style_ids = {s.get(f"{{{W}}}styleId") for s in styles.iterfind("w:style", NS)}
    for sid in ["JDAdded", "JDRemoved"]:
        if sid not in style_ids:
            errors.append(f"Missing character style '{sid}' in styles.xml")

    all_sdts = doc.findall(".//w:sdt", NS)
    tags = [tag_of(s) for s in all_sdts if tag_of(s)]
    dupes = sorted({t for t in tags if tags.count(t) > 1})
    if dupes:
        errors.append(f"Duplicate tags: {dupes}")

    for s in all_sdts:
        t, a = tag_of(s), alias_of(s)
        if t and a != t:
            errors.append(f"Control '{t}': Title (alias) '{a}' must equal Tag")
        if s.find("w:sdtPr/w:richText", NS) is not None:
            errors.append(f"Control '{t}' is Rich Text; must be Plain Text")
        txt = "".join(s.itertext())
        if "Click or tap" in txt:
            errors.append(f"Control '{t}' still shows placeholder text")

    def find(tag):
        return doc.xpath(f'//w:sdt[w:sdtPr/w:tag/@w:val="{tag}"]', namespaces=NS)

    for name in SINGLE:
        found = find(name)
        if not found:
            errors.append(f"Missing single control '{name}'")
            continue
        s = found[0]
        if s.find("w:sdtPr/w:text", NS) is None:
            errors.append(f"'{name}' must be a Plain Text control (<w:text/>)")
        if s.xpath("ancestor::w:sdt", namespaces=NS):
            errors.append(f"'{name}' must not be inside another control")

    for rep, prefix in REPEATING.items():
        found = find(rep)
        if not found:
            errors.append(f"Missing repeating section '{rep}'")
            continue
        r = found[0]
        if r.find("w:sdtPr/w15:repeatingSection", NS) is None:
            errors.append(f"'{rep}' is not a Repeating Section control")
        items = r.findall("w:sdtContent/w:sdt", NS)
        items = [i for i in items if i.find("w:sdtPr/w15:repeatingSectionItem", NS) is not None]
        if len(items) != 1:
            errors.append(f"'{rep}' must contain exactly 1 repeating item (found {len(items)})")
            continue
        item = items[0]
        for suffix, style in STYLE_FOR.items():
            child = f"{prefix}{suffix}"
            inside = item.xpath(f'.//w:sdt[w:sdtPr/w:tag/@w:val="{child}"]', namespaces=NS)
            if not inside:
                errors.append(f"'{child}' missing inside '{rep}'")
                continue
            c = inside[0]
            if c.find("w:sdtPr/w:text", NS) is None:
                errors.append(f"'{child}' must be a Plain Text control")
            got = c.find("w:sdtPr/w:rPr/w:rStyle", NS)
            got = got.get(f"{{{W}}}val") if got is not None else None
            if got != style:
                errors.append(f"'{child}' style is {got!r}; expected {style!r}")
        extra = [tag_of(c) for c in item.findall(".//w:sdt", NS)
                 if tag_of(c) and not tag_of(c).startswith(prefix)]
        if extra:
            errors.append(f"'{rep}' contains controls from another section: {extra}")

    for f in FORBIDDEN:
        if find(f):
            errors.append(f"Restricted field control '{f}' must not be in the template")
    for f in REPLACED:
        if find(f):
            errors.append(f"Old control '{f}' must be removed (replaced by a repeating section)")

    expected = set(SINGLE) | set(REPEATING) | {f"{p}{s}" for p in REPEATING.values() for s in STYLE_FOR}
    unexpected = sorted(set(tags) - expected)
    if unexpected:
        warnings.append(f"Unexpected extra controls (flow won't fill them): {unexpected}")

    print(f"Controls found: {len(tags)} (expected {len(expected)})")
    for w in warnings: print("WARN:", w)
    for e in errors: print("FAIL:", e)
    print("RESULT:", "PASS" if not errors else "FAIL")
    return 0 if not errors else 1

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
```

**Also check:**
1. **The file opens** and renders. Convert to PDF and look at both tables: same layout as before, no placeholder text, no "Click or tap here".
2. **Nothing else changed.** Compare the old and new `document.xml`. The only differences should be in the two cells you edited.
3. **Optional fill test:** in a copy, duplicate the `EduLevelRows` item once, put "High school" in `EduLevelRemoved` of one copy and "Bachelors Degree" in `EduLevelAdded` of the other, and render. Removed should be red with strikethrough, and Added bold with yellow shading.

---

## 7. Reference: the full control list after your change (45)

```
JobTitle  RelationshipManager  NMLS  SalesNonSales  PeopleManagement

PurposeRows     PurposeKept     PurposeAdded     PurposeRemoved
DutiesRows      DutiesKept      DutiesAdded      DutiesRemoved
EducationRows   EducationKept   EducationAdded   EducationRemoved
EduReqRows      EduReqKept      EduReqAdded      EduReqRemoved
EduLevelRows    EduLevelKept    EduLevelAdded    EduLevelRemoved      ← new
ExperienceRows  ExperienceKept  ExperienceAdded  ExperienceRemoved
ExpReqRows      ExpReqKept      ExpReqAdded      ExpReqRemoved
ExpLevelRows    ExpLevelKept    ExpLevelAdded    ExpLevelRemoved      ← new
KSARows         KSAKept         KSAAdded         KSARemoved
CertsRows       CertsKept       CertsAdded       CertsRemoved
```

**Removed:** `EducationLevel`, `ExperienceLevel`.

---

## 8. Deliver

1. Return the updated `JD Change Template.docx`.
2. Report:
   - the verification output (`RESULT: PASS`, 45 controls)
   - the IDs you used
   - anything in the file that didn't match this spec and how you handled it
3. **Don't** rename, add or remove any other control, or change anything outside the two cells.
