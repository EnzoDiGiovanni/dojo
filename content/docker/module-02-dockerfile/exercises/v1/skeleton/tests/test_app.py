import humanize


def test_naturaldelta():
    assert humanize.naturaldelta(90) == "a minute"
