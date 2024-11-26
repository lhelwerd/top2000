"""
Detection, decision making and adjustments for collisions between tracks based
on normalized keys.
"""

# pylint: disable=too-many-arguments

def check_collision(key, data, year, pos_field):
    """
    Check if a track already has data for the current year.
    """

    return (year is not None and str(year) in data["tracks"][key]) \
            or (pos_field is not None and year is None \
                and pos_field in data["tracks"][key])

def update_row(key, row, data, year=None, pos_field=None, best_key=None):
    """
    Update data for a track.
    """

    new_row = row.copy()
    if key in data["tracks"]:
        if check_collision(key, data, year, pos_field):
            #print(f"Potential collision ({year]: {key!r} {best_key!r} {row!r}")
            #print(data['tracks'][key])
            if pos_field in data["tracks"][key]:
                return best_key, False

            if best_key == key or (best_key is None and \
                "best" in data["tracks"][key] and \
                data["tracks"][key]["best"] is not True):
                #if data["tracks"][key]["artiest"].lower() == "di-rect":
                #if data["tracks"][key]["titel"] == "Times Are Changing":
                #print(f"Collision ({year}): {key!r} {best_key!r} {row!r} {data['tracks'][key]!r}")
                data["tracks"][key] = new_row

            return best_key, False

        new_row.update(data["tracks"][key])
        if "best" in new_row:
            best_key = key if new_row["best"] is True else new_row["best"]

    data["tracks"][key] = new_row
    #print(key, data["tracks"][key])
    return best_key, True
