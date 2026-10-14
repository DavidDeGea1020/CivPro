# Agent Spec: Add Content Controls to the JD Change Template

You are preparing a Microsoft Word template (`.docx`) that a Power Automate flow will fill in using the **Populate a Microsoft Word template** action (Word Online Business connector). Your job is to take the blank **City National Bank job description template** and add the content controls the flow expects, with the exact names, types, structure, and formatting below.

The flow matches controls **by name**. A misspelled name, a wrong control type, or a broken repeating section causes the flow to leave a section blank or produce a file Word can't open. Follow this spec exactly. Don't improvise.

---

## 1. Inputs and output

**You receive:** the blank JD template `.docx`, with logo, black section bars, and tables.

**You produce:** `JD Change Template.docx`, the same document with:
- the content controls in Section 4 inserted in the right places
- the formatting changes in Section 5 applied
- the text removals in Section 6 applied
- no other changes to layout, logo, or wording

**You verify:** run the script in Section 8. It must print `RESULT: PASS`.

---

## 2. How the flow uses the template

Understanding this prevents most mistakes.

- **Single fields** are Plain Text controls. The flow writes one text value into each.
- **Sections that can change** (Purpose, Duties, Education, and so on) are **repeating sections**. Each contains **one** item with three Plain Text controls side by side:
  - `…Kept`: unchanged text. No style; plain.
  - `…Added`: new text. Character style **JD Added** (bold, yellow shading).
  - `…Removed`: deleted text. Character style **JD Removed** (red, strikethrough).
- For every line of a section, the flow copies the item once and fills **exactly one** of the three controls. The other two stay empty.
- That's why empty controls must show **nothing**: no placeholder text, no spaces. Otherwise every row would show stray text.

Example of what the flow sends for Principal Duties:
```json
[
  {"DutiesKept": "Processes deposits, withdrawals, and transfers", "DutiesAdded": "", "DutiesRemoved": ""},
  {"DutiesKept": "", "DutiesAdded": "Opens consumer and small business accounts", "DutiesRemoved": ""},
  {"DutiesKept": "", "DutiesAdded": "", "DutiesRemoved": "Refers clients to specialists"}
]
```

---

## 3. Hard rules

Every control in the document must follow all of these.

1. **Plain Text controls only** for text fields (`<w:text/>` in XML). Never Rich Text, Combo Box, Date Picker, or legacy form fields.
2. **Title = Tag**, both set to the exact name in Section 4. Names are case-sensitive and contain no spaces.
3. **Every name is unique** in the document.
4. **No placeholder text.** An empty control contains a single zero-width space (U+200B), not "Click or tap here to enter text."
5. **Each repeating section contains exactly one item**, and that item contains exactly the three controls for **its own** section prefix.
6. **Repeating sections wrap either one paragraph or one table row**, nothing more. Don't include the section bar, a heading, or blank paragraphs inside them.
7. **No controls in text boxes, shapes, headers, footers, or merged table cells.**
8. **Don't add controls for restricted fields:** Grade, Job Code, Salary/Hourly, or Status.
9. **Don't nest single-field controls** inside other controls.
10. **Leave these control properties unchecked:** "Remove content control when contents are edited" and "Contents cannot be edited." For XML, that means no `<w:temporary/>` and no `<w:lock w:val="contentLocked"/>`.
11. The file must be a normal `.docx` (Word 2013+ format, not Compatibility Mode), with no tracked changes and no comments.

---

## 4. Control map

### 4.1 Single fields — Job Description section

The **Job Description** table has a label column on the left and a value column on the right. Put each control in the **value cell** next to its label.

| Label in template | Control name (Title = Tag) | Multi-line |
|---|---|---|
| Functional Title: | `JobTitle` | No |
| Relationship Manager: | `RelationshipManager` | No |
| NMLS: | `NMLS` | No |
| Sales/Non-Sales: | `SalesNonSales` | No |
| People Management: | `PeopleManagement` | No |

### 4.2 Single fields — Education and Work Experience tables

| Location | Control name | Multi-line |
|---|---|---|
| Education table, **Education Level** column, data row | `EducationLevel` | No |
| Work Experience table, **Experience** column, data row | `ExperienceLevel` | No |

These two are left blank by the flow for now, but they must exist.

### 4.3 Repeating sections

| Section bar | Repeating section | Wraps | Kept | Added (JD Added) | Removed (JD Removed) |
|---|---|---|---|---|---|
| Purpose | `PurposeRows` | One **paragraph** under the bar | `PurposeKept` | `PurposeAdded` | `PurposeRemoved` |
| Principal Duties and Responsibilities | `DutiesRows` | One **table row** (bullet cell + text cell) | `DutiesKept` | `DutiesAdded` | `DutiesRemoved` |
| Education, **Education Details** cell | `EducationRows` | One **paragraph** inside the cell | `EducationKept` | `EducationAdded` | `EducationRemoved` |
| Education, **Req/Pref** cell | `EduReqRows` | One **paragraph** inside the cell | `EduReqKept` | `EduReqAdded` | `EduReqRemoved` |
| Work Experience, **Experience Details** cell | `ExperienceRows` | One **paragraph** inside the cell | `ExperienceKept` | `ExperienceAdded` | `ExperienceRemoved` |
| Work Experience, **Req/Pref** cell | `ExpReqRows` | One **paragraph** inside the cell | `ExpReqKept` | `ExpReqAdded` | `ExpReqRemoved` |
| Knowledge, Skills and Abilities | `KSARows` | One **table row** (bullet cell + text cell) | `KSAKept` | `KSAAdded` | `KSARemoved` |
| Licenses and Certifications | `CertsRows` | One **table row** (bullet cell + text cell) | `CertsKept` | `CertsAdded` | `CertsRemoved` |

**Bulleted sections (Duties, KSAs, Certifications):** the original template shows many empty bullet rows. **Delete all but one**, then wrap that one row in the repeating section. The flow creates as many rows as it needs. Put the three controls in the **text cell**, not the bullet cell. Keep the bullet character in the bullet cell.

**Education Equivalency cell:** leave it empty with no control.

**Total:** 7 single controls + 8 repeating sections + 24 inner controls = **39 tagged controls**.

---

## 5. Formatting changes

| Element | Formatting |
|---|---|
| Every black section bar (Job Description, Purpose, Principal Duties and Responsibilities, QUALIFICATIONS, Education, Work Experience, Knowledge Skills and Abilities, Licenses and Certifications) | **Tahoma, 12 pt**, white text on black, **not bold, not italic** |
| Left label column of the **Job Description** table | **No shading** (remove the gray fill) |
| All other text, including labels, table headers, and the text inside controls | **Arial, 9 pt** |
| `JD Added` character style | Bold, yellow shading (`FFFF00`) |
| `JD Removed` character style | Strikethrough, red (`C00000`) |

Create the two character styles if they don't exist:
- **Name:** `JD Added` · **Style ID:** `JDAdded` · **Type:** Character
- **Name:** `JD Removed` · **Style ID:** `JDRemoved` · **Type:** Character

Set the document default font to Arial 9 pt (`<w:rPrDefault>`: `w:rFonts` = Arial, `w:sz` = `18`), and set Tahoma 12 pt (`w:sz` = `24`) directly on the section bar runs.

Keep a blank paragraph between the **QUALIFICATIONS** bar and the **Education** bar so the two black bars don't merge into one block.

---

## 6. Text to remove

Delete these from the template. Keep their section bars where noted.

| Text | Where | Keep the bar? |
|---|---|---|
| "Has a sense of urgency and works as a team in providing 'Best in Class Client Experience.'" | Under Purpose | Yes (Purpose bar stays) |
| The paragraph starting "To perform this job successfully, an individual must be able to…" | Under QUALIFICATIONS | Yes |
| "An equivalent combination of education and/or relevant professional experience may be considered in lieu of a degree." | Education Equivalency cell | Yes (header "Education Equivalency" stays; the cell is left empty) |
| "Only if it applies" | Under Licenses and Certifications | Yes |
| Any "Change Request Details" section, if present | Anywhere | **No** (remove the whole section) |

---

## 7. XML reference

If you edit `word/document.xml` directly, use these patterns. Unzip the `.docx`, edit, and re-zip. Don't reformat or pretty-print the XML.

**Required namespaces** on `<w:document>`. Add `w15` if it's missing:
```xml
xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
mc:Ignorable="w14 w15"
```

**Plain Text control (single field):**
```xml
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="JobTitle"/>
    <w:tag w:val="JobTitle"/>
    <w:id w:val="1001"/>
    <w:text/>
  </w:sdtPr>
  <w:sdtContent>
    <w:r><w:t xml:space="preserve">​</w:t></w:r>
  </w:sdtContent>
</w:sdt>
```
- The `<w:t>` contains one zero-width space (U+200B).
- `<w:id>` must be a unique integer for every `<w:sdt>`.
- For multi-line fields, use `<w:text w:multiLine="1"/>`.

**Styled Plain Text control (`…Added`):**
```xml
<w:sdt>
  <w:sdtPr>
    <w:rPr><w:rStyle w:val="JDAdded"/></w:rPr>
    <w:alias w:val="DutiesAdded"/>
    <w:tag w:val="DutiesAdded"/>
    <w:id w:val="1002"/>
    <w:text/>
  </w:sdtPr>
  <w:sdtContent>
    <w:r><w:rPr><w:rStyle w:val="JDAdded"/></w:rPr><w:t xml:space="preserve">​</w:t></w:r>
  </w:sdtContent>
</w:sdt>
```
Use `JDRemoved` the same way for `…Removed`. `…Kept` has no `rPr`.

**Repeating section wrapping one paragraph** (Purpose, Education/Experience cells):
```xml
<w:sdt>
  <w:sdtPr>
    <w:alias w:val="PurposeRows"/>
    <w:tag w:val="PurposeRows"/>
    <w:id w:val="1010"/>
    <w15:repeatingSection/>
  </w:sdtPr>
  <w:sdtContent>
    <w:sdt>
      <w:sdtPr>
        <w:id w:val="1011"/>
        <w15:repeatingSectionItem/>
      </w:sdtPr>
      <w:sdtContent>
        <w:p>
          <!-- PurposeKept control -->
          <!-- PurposeAdded control -->
          <!-- PurposeRemoved control -->
        </w:p>
      </w:sdtContent>
    </w:sdt>
  </w:sdtContent>
</w:sdt>
```
Inside a table cell (`<w:tc>`), the outer `<w:sdt>` goes where the cell's `<w:p>` was. A cell must still end up containing at least one paragraph, which it does through the repeating item.

**Repeating section wrapping one table row** (Duties, KSAs, Certs). The `<w:sdt>` sits **inside `<w:tbl>`**, in place of the `<w:tr>`:
```xml
<w:tbl>
  <w:tblPr>…</w:tblPr>
  <w:tblGrid>…</w:tblGrid>
  <w:sdt>
    <w:sdtPr><w:alias w:val="DutiesRows"/><w:tag w:val="DutiesRows"/><w:id w:val="1020"/><w15:repeatingSection/></w:sdtPr>
    <w:sdtContent>
      <w:sdt>
        <w:sdtPr><w:id w:val="1021"/><w15:repeatingSectionItem/></w:sdtPr>
        <w:sdtContent>
          <w:tr>
            <w:tc><!-- bullet cell: <w:p> with "•" --></w:tc>
            <w:tc><w:p><!-- DutiesKept / DutiesAdded / DutiesRemoved controls --></w:p></w:tc>
          </w:tr>
        </w:sdtContent>
      </w:sdt>
    </w:sdtContent>
  </w:sdt>
</w:tbl>
```

**Section bar run** (Tahoma 12, not bold):
```xml
<w:r>
  <w:rPr><w:rFonts w:ascii="Tahoma" w:hAnsi="Tahoma" w:cs="Tahoma"/><w:color w:val="FFFFFF"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  <w:t>Principal Duties and Responsibilities</w:t>
</w:r>
```
Remove any `<w:b/>`, `<w:bCs/>`, `<w:i/>`, or `<w:iCs/>` from bar runs.

**Character styles** in `word/styles.xml`:
```xml
<w:style w:type="character" w:customStyle="1" w:styleId="JDAdded">
  <w:name w:val="JD Added"/><w:basedOn w:val="DefaultParagraphFont"/><w:qFormat/>
  <w:rPr><w:b/><w:bCs/><w:shd w:val="clear" w:color="auto" w:fill="FFFF00"/></w:rPr>
</w:style>
<w:style w:type="character" w:customStyle="1" w:styleId="JDRemoved">
  <w:name w:val="JD Removed"/><w:basedOn w:val="DefaultParagraphFont"/><w:qFormat/>
  <w:rPr><w:strike/><w:color w:val="C00000"/></w:rPr>
</w:style>
```
If `DefaultParagraphFont` isn't defined in `styles.xml`, add it or remove the `basedOn` line.

**Before editing:** Word often splits visible text across many `<w:r>` runs. Merge adjacent runs with identical formatting first, so phrases like "Has a sense of urgency…" can be found and removed cleanly.

---

## 8. Verification (required)

Save this as `verify_jd_template.py` and run `python3 verify_jd_template.py "JD Change Template.docx"`. It needs `lxml`. **Don't deliver the file until it prints `RESULT: PASS`.**

```python
#!/usr/bin/env python3
"""Checks a JD Change Template .docx against the content-control spec."""
import sys, zipfile
from lxml import etree

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W15 = "http://schemas.microsoft.com/office/word/2012/wordml"
NS = {"w": W, "w15": W15}

SINGLE = ["JobTitle", "RelationshipManager", "NMLS", "SalesNonSales", "PeopleManagement",
          "EducationLevel", "ExperienceLevel"]
REPEATING = {
    "PurposeRows": "Purpose", "DutiesRows": "Duties", "EducationRows": "Education",
    "EduReqRows": "EduReq", "ExperienceRows": "Experience", "ExpReqRows": "ExpReq",
    "KSARows": "KSA", "CertsRows": "Certs",
}
FORBIDDEN = ["Grade", "JobCode", "SalaryType", "SalaryHourly", "Status"]
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
        if "Click or tap" in "".join(s.itertext()):
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
        items = [i for i in r.findall("w:sdtContent/w:sdt", NS)
                 if i.find("w:sdtPr/w15:repeatingSectionItem", NS) is not None]
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
1. **The file opens.** Convert it to PDF (e.g., `soffice --headless --convert-to pdf "JD Change Template.docx"`) and look at the result. Every section bar should be visible, there should be one bullet row each in Duties, KSAs, and Certifications, no placeholder text, and no leftover removed text from Section 6.
2. **Formatting:** bars are Tahoma 12 and not bold; all other text is Arial 9; the Job Description label column has no gray.
3. **Optional fill test:** duplicate each repeating item two or three times in a copy of the file, put sample text in Kept, Added, and Removed, and render it. Kept should be plain, Added bold with yellow shading, and Removed red with strikethrough.

---

## 9. Deliver

1. Return `JD Change Template.docx`.
2. Report:
   - the verification output (must be `RESULT: PASS`)
   - anything in the original template that didn't match this spec and how you handled it (e.g., a section that wasn't a table, or a missing label)
   - anything you couldn't do

**Don't:**
- rename, add, or remove controls beyond Section 4
- change section order, the logo, or wording other than the removals in Section 6
- leave extra empty bullet rows in Duties, KSAs, or Certifications
- add controls for Grade, Job Code, Salary/Hourly, or Status

---

## Appendix — Quick reference

**All 39 tags:**

```
JobTitle  RelationshipManager  NMLS  SalesNonSales  PeopleManagement
EducationLevel  ExperienceLevel

PurposeRows     PurposeKept     PurposeAdded     PurposeRemoved
DutiesRows      DutiesKept      DutiesAdded      DutiesRemoved
EducationRows   EducationKept   EducationAdded   EducationRemoved
EduReqRows      EduReqKept      EduReqAdded      EduReqRemoved
ExperienceRows  ExperienceKept  ExperienceAdded  ExperienceRemoved
ExpReqRows      ExpReqKept      ExpReqAdded      ExpReqRemoved
KSARows         KSAKept         KSAAdded         KSARemoved
CertsRows       CertsKept       CertsAdded       CertsRemoved
```

**Section order in the document:**
1. Logo + "Job Description" title
2. **Job Description** bar → label/value table (5 single controls)
3. **Purpose** bar → `PurposeRows`
4. **Principal Duties and Responsibilities** bar → bullet table with `DutiesRows`
5. **QUALIFICATIONS** bar → blank paragraph
6. **Education** bar → table: header row (Education Level · Education Details · Req/Pref · Education Equivalency), data row (`EducationLevel` · `EducationRows` · `EduReqRows` · empty)
7. **Work Experience** bar → table: header row (Experience · Experience Details · Req/Pref), data row (`ExperienceLevel` · `ExperienceRows` · `ExpReqRows`)
8. **Knowledge, Skills and Abilities** bar → bullet table with `KSARows`
9. **Licenses and Certifications** bar → bullet table with `CertsRows`
