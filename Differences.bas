REM  *****  BASIC  *****

Sub Main
	Dim oSheet
	Dim oRange
	Dim oRows
	Dim oRowEnum
	Dim oRow
	Dim oFirst
	Dim oLast
	Dim oTitle
	Dim s as String
	Dim app as String
	Dim first as Integer
	Dim last as Integer
	
	oSheet = ThisComponent.Sheets(0)
	oRange = oSheet.getCellRangeByName("E2:E2001")
	oRows = oRange.getRows()
	oRowEnum = oRows.createEnumeration()
	Do While oRowEnum.hasMoreElements()
		oRow = oRowEnum.nextElement()
		oFirst = oRow.getCellByPosition(0, 0)
		oLast = oRow.getCellByPosition(4, 0)
		oTitle = oRow.getCellByPosition(2, 0)
		first = oFirst.getValue()
		last = oLast.getValue()
		If last = 0 Then
			app = "+"
		ElseIf first < last Then
			app = CHR$(&H25B4) & ABS(first - last)
		ElseIf first > last Then
			app = CHR$(&H25BF) & ABS(first - last)
		Else
			app = "="
		End If
		oTitle.setString(oTitle.getString() & " (" & app & ")")
	Loop
	MsgBox "Done."

End Sub
